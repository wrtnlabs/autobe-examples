import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotificationUnreadCount";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditCommunityMemberNotificationsUnreadCount(props: {
  member: MemberPayload;
}): Promise<IRedditCommunityNotificationUnreadCount> {
  const count = await MyGlobal.prisma.reddit_community_notifications.count({
    where: {
      recipient_id: props.member.id,
      read_at: null,
    },
  });

  return {
    count,
  };
}
