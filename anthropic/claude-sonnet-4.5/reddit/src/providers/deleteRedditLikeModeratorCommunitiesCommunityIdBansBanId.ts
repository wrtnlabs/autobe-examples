import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditLikeModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId, banId } = props;

  // Verify moderator has permission for this community
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

  // Fetch the ban record to validate existence and community match
  const ban =
    await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
      where: { id: banId },
    });

  // Verify ban belongs to the specified community
  if (ban.community_id !== communityId) {
    throw new HttpException(
      "Bad Request: Ban does not belong to the specified community",
      400,
    );
  }

  // Check if ban is already lifted (soft-deleted)
  if (ban.deleted_at !== null) {
    throw new HttpException("Bad Request: Ban has already been lifted", 400);
  }

  // Check if ban is currently active
  if (!ban.is_active) {
    throw new HttpException("Bad Request: Ban is not currently active", 400);
  }

  // Perform soft delete by setting deleted_at and updating is_active
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_community_bans.update({
    where: { id: banId },
    data: {
      deleted_at: now,
      is_active: false,
      updated_at: now,
    },
  });
}
