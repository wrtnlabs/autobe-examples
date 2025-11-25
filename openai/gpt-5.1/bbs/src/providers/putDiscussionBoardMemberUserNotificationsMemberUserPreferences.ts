import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserNotificationPreference";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putDiscussionBoardMemberUserNotificationsMemberUserPreferences(props: {
  memberUser: MemberuserPayload;
  body: IDiscussionBoardMemberuserNotificationPreference.IUpdate;
}): Promise<IDiscussionBoardMemberuserNotificationPreference> {
  const memberId = props.memberUser.id;

  // Capture a single "now" timestamp to keep create/update operations consistent
  const now = new Date();

  const preference =
    await MyGlobal.prisma.discussion_board_memberuser_notification_preferences.upsert(
      {
        where: {
          discussion_board_memberuser_id: memberId,
        },
        create: {
          id: v4(),
          discussion_board_memberuser_id: memberId,
          activity_notifications_enabled:
            props.body.activity_notifications_enabled,
          digest_notifications_enabled: props.body.digest_notifications_enabled,
          marketing_notifications_enabled:
            props.body.marketing_notifications_enabled,
          created_at: now,
          updated_at: now,
        },
        update: {
          activity_notifications_enabled:
            props.body.activity_notifications_enabled,
          digest_notifications_enabled: props.body.digest_notifications_enabled,
          marketing_notifications_enabled:
            props.body.marketing_notifications_enabled,
          updated_at: now,
        },
      },
    );

  return {
    id: preference.id,
    discussion_board_memberuser_id: preference.discussion_board_memberuser_id,
    activity_notifications_enabled: preference.activity_notifications_enabled,
    digest_notifications_enabled: preference.digest_notifications_enabled,
    marketing_notifications_enabled: preference.marketing_notifications_enabled,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
  };
}
