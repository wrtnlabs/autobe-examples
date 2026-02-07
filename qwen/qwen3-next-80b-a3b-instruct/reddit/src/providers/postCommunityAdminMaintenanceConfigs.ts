import { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminMaintenanceConfigs(props: {
  admin: AdminPayload;
  body: ICommunityMaintenanceConfig.ICreate;
}): Promise<ICommunityMaintenanceConfig> {
  const id = v4() as string & tags.Format<"uuid">;
  // Default values as per specification and database schema
  const task_type = "cleanup";
  const schedule_cron = "0 2 * * *";
  const enabled = true;
  const config_data = null;
  const max_retries = 3;
  const timeout_seconds = 300;
  const notification_email = null;
  // Calculate next_run_at based on schedule_cron - default to next 2AM UTC
  let nextRunAt: string | null = null;
  const now = new Date();
  const next2am = new Date(now);
  next2am.setUTCMinutes(0);
  next2am.setUTCHours(2);
  next2am.setUTCSeconds(0);
  next2am.setUTCMilliseconds(0);
  // If 2AM today has passed, use tomorrow's 2AM
  if (
    now.getUTCHours() > 2 ||
    (now.getUTCHours() === 2 && now.getUTCMinutes() > 0)
  ) {
    next2am.setUTCDate(next2am.getUTCDate() + 1);
  }
  nextRunAt = toISOStringSafe(next2am);
  // Create record with all fields from database schema
  const created = await MyGlobal.prisma.community_maintenance_configs.create({
    data: {
      id,
      task_type,
      schedule_cron,
      enabled,
      last_run_at: null,
      next_run_at: nextRunAt,
      config_data,
      max_retries,
      timeout_seconds,
      notification_email,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
  });
  // Return full configuration with all fields from database schema
  return {
    id: created.id as string & tags.Format<"uuid">,
    task_type: created.task_type,
    schedule_cron: created.schedule_cron,
    enabled: created.enabled,
    last_run_at: created.last_run_at
      ? toISOStringSafe(created.last_run_at)
      : null,
    next_run_at: created.next_run_at
      ? toISOStringSafe(created.next_run_at)
      : null,
    config_data: created.config_data,
    max_retries: created.max_retries,
    timeout_seconds: created.timeout_seconds,
    notification_email: created.notification_email,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
