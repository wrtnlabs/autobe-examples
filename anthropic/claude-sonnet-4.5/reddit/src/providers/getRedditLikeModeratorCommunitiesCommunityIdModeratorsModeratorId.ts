import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditLikeModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityModerator> {
  const { moderator, communityId, moderatorId } = props;

  // Verify community exists
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Fetch the specific moderator assignment by ID
  const assignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findUnique({
      where: { id: moderatorId },
    });

  if (!assignment) {
    throw new HttpException("Moderator assignment not found", 404);
  }

  // Verify the assignment belongs to the requested community
  if (assignment.community_id !== communityId) {
    throw new HttpException(
      "Moderator assignment does not belong to this community",
      404,
    );
  }

  // Authorization: Check if authenticated moderator can view this assignment
  const authenticatedModeratorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  const isViewingOwnAssignment = assignment.moderator_id === moderator.id;

  if (!authenticatedModeratorAssignment && !isViewingOwnAssignment) {
    throw new HttpException(
      "Unauthorized: You can only view moderator assignments for communities you moderate",
      403,
    );
  }

  // Return properly formatted response
  return {
    id: assignment.id,
    community_id: assignment.community_id,
    moderator_id: assignment.moderator_id,
    assigned_at: toISOStringSafe(assignment.assigned_at),
    is_primary: assignment.is_primary,
    permissions: assignment.permissions,
  };
}
