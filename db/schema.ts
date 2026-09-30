import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('practice_profiles',{userId:text('user_id').primaryKey(),data:text('data').notNull()});
export const sessions=sqliteTable('practice_sessions',{userId:text('user_id').notNull(),date:text('date').notNull(),data:text('data').notNull()},t=>[primaryKey({columns:[t.userId,t.date]})]);
export const milestones=sqliteTable('practice_milestones',{userId:text('user_id').notNull(),month:text('month').notNull(),date:text('date').notNull(),data:text('data').notNull()},t=>[primaryKey({columns:[t.userId,t.month,t.date]})]);
