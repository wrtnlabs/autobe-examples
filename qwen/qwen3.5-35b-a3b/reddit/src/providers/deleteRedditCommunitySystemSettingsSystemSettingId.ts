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
  const setting =
    await MyGlobal.prisma.reddit_community_system_settings.findUniqueOrThrow({
      where: { id: props.systemSettingId },
    });
  if (setting.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const deletedAt = new Date();
  await MyGlobal.prisma.reddit_community_system_settings.update({
    where: { id: props.systemSettingId },
    data: { deleted_at: deletedAt },
  });
  await MyGlobal.prisma.reddit_community_system_logs.create({
    data: {
      id: v4(),
      actor_id: null,
      target_post_id: null,
      target_comment_id: null,
      target_community_id: null,
      target_report_id: null,
      activity_type: "system_setting_delete",
      action_performed: "DELETE",
      target_type: "SYSTEM_SETTING",
      metadata: JSON.stringify({ system_setting_id: props.systemSettingId }),
      created_at: deletedAt,
      updated_at: deletedAt,
    },
  });
}
