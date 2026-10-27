-- Run this in Supabase SQL Editor only if you want optional cloud chat history.
-- Authentication and row-level security are enabled. Never use a service-role key in the browser.
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 12000),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can read their own chat messages"
  on public.chat_messages for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
  on public.chat_messages for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
  on public.chat_messages for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);
