import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditLikeModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityBan> {
  const { moderator, communityId, banId } = props;

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  const ban = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      id: banId,
      deleted_at: null,
    },
  });

  if (!ban) {
    throw new HttpException("Community ban not found or has been removed", 404);
  }

  if (ban.community_id !== communityId) {
    throw new HttpException(
      "Ban does not belong to the specified community",
      404,
    );
  }

  return {
    id: ban.id,
    banned_member_id: ban.banned_member_id,
    community_id: ban.community_id,
    ban_reason_category: ban.ban_reason_category,
    ban_reason_text: ban.ban_reason_text,
    is_permanent: ban.is_permanent,
    expiration_date: ban.expiration_date
      ? toISOStringSafe(ban.expiration_date)
      : undefined,
    is_active: ban.is_active,
    created_at: toISOStringSafe(ban.created_at),
  };
}
