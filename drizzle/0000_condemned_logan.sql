CREATE TABLE `practice_milestones` (
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`user_id`, `month`, `date`)
);
--> statement-breakpoint
CREATE TABLE `practice_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
