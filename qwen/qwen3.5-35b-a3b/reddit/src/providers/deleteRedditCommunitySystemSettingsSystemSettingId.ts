import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunitySystemSettingsSystemSettingId(props: {
  systemSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the system setting
  const setting =
    await MyGlobal.prisma.reddit_community_system_settings.findUniqueOrThrow({
      where: { id: props.systemSettingId },
      select: {
        id: true,
        key: true,
        value: true,
        deleted_at: true,
        updated_at: true,
      },
    });
  // Verify not already deleted
  if (setting.deleted_at !== null) {
    throw new HttpException("Setting already deleted", 400);
  }
  // Soft delete the record
  const now = new Date();
  await MyGlobal.prisma.reddit_community_system_settings.update({
    where: { id: props.systemSettingId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Log the deletion in system logs
  await MyGlobal.prisma.reddit_community_system_logs.create({
    data: {
      id: v4(),
      activity_type: "system_settings_delete",
      action_performed: "delete",
      target_type: "system_settings",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
