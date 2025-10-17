import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditLikeModeratorCommunitiesCommunityId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId } = props;

  // Fetch the community to verify it exists and is not already deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found or already deleted", 404);
  }

  // Verify authorization - check if moderator is the primary moderator for this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
        is_primary: true,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: Only the primary moderator can delete this community",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_communities.update({
    where: {
      id: communityId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
