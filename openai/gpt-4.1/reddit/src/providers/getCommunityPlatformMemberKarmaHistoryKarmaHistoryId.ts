import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberKarmaHistoryKarmaHistoryId(props: {
  member: MemberPayload;
  karmaHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaHistory> {
  const { member, karmaHistoryId } = props;
  const record =
    await MyGlobal.prisma.community_platform_karma_history.findUnique({
      where: { id: karmaHistoryId },
    });
  if (!record) {
    throw new HttpException("Karma history record not found", 404);
  }
  if (record.community_platform_member_id !== member.id) {
    throw new HttpException(
      "Forbidden: Cannot access another member's karma history record",
      403,
    );
  }
  return {
    id: record.id,
    community_platform_member_id: record.community_platform_member_id,
    community_platform_community_id:
      record.community_platform_community_id ?? undefined,
    community_platform_post_id: record.community_platform_post_id ?? undefined,
    community_platform_comment_id:
      record.community_platform_comment_id ?? undefined,
    event_type: record.event_type,
    change_amount: record.change_amount,
    event_context: record.event_context,
    event_time: toISOStringSafe(record.event_time),
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
