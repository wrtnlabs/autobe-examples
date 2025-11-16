import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserNotificationPreference";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getDiscussionBoardMemberUserNotificationsMemberUserPreferences(props: {
  memberUser: MemberuserPayload;
}): Promise<IDiscussionBoardMemberuserNotificationPreference> {
  const memberUserId: string = props.memberUser.id satisfies string as string;

  const existing =
    await MyGlobal.prisma.discussion_board_memberuser_notification_preferences.findFirst(
      {
        where: {
          discussion_board_memberuser_id: memberUserId,
        },
      },
    );

  if (existing !== null) {
    return {
      id: existing.id,
      discussion_board_memberuser_id: existing.discussion_board_memberuser_id,
      activity_notifications_enabled: existing.activity_notifications_enabled,
      digest_notifications_enabled: existing.digest_notifications_enabled,
      marketing_notifications_enabled: existing.marketing_notifications_enabled,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    } satisfies IDiscussionBoardMemberuserNotificationPreference;
  }

  const createdAt = toISOStringSafe(new Date());
  const updatedAt = createdAt;

  const created =
    await MyGlobal.prisma.discussion_board_memberuser_notification_preferences.create(
      {
        data: {
          id: v4(),
          discussion_board_memberuser_id: memberUserId,
          activity_notifications_enabled: true,
          digest_notifications_enabled: true,
          marketing_notifications_enabled: false,
          created_at: createdAt,
          updated_at: updatedAt,
        },
      },
    );

  return {
    id: created.id,
    discussion_board_memberuser_id: created.discussion_board_memberuser_id,
    activity_notifications_enabled: created.activity_notifications_enabled,
    digest_notifications_enabled: created.digest_notifications_enabled,
    marketing_notifications_enabled: created.marketing_notifications_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  } satisfies IDiscussionBoardMemberuserNotificationPreference;
}
