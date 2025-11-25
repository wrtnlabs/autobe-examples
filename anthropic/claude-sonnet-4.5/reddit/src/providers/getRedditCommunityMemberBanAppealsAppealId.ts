import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditCommunityMemberBanAppealsAppealId(props: {
  member: MemberPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityBanAppeal> {
  const appeal = await MyGlobal.prisma.reddit_community_ban_appeals.findUnique({
    where: { id: props.appealId },
    include: {
      ban: true,
    },
  });

  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }

  if (appeal.ban.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: appeal.id,
    reddit_community_community_ban_id: appeal.reddit_community_community_ban_id,
    appeal_text: appeal.appeal_text,
    status: appeal.status as
      | "pending"
      | "approved"
      | "denied"
      | "expired_no_review",
    moderator_response: appeal.moderator_response ?? null,
    reddit_community_moderator_id: appeal.reddit_community_moderator_id ?? null,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at: appeal.deleted_at ? toISOStringSafe(appeal.deleted_at) : null,
  };
}
