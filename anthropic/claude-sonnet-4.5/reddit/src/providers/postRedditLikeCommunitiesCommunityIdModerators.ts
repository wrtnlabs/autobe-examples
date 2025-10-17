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

export async function postRedditLikeCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.ICreate;
}): Promise<IRedditLikeCommunityModerator> {
  const { moderator, communityId, body } = props;

  // Verify community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Verify requesting moderator has 'manage_moderators' permission
  const requesterAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!requesterAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  const requesterPermissions = requesterAssignment.permissions
    .split(",")
    .map((p) => p.trim());
  if (!requesterPermissions.includes("manage_moderators")) {
    throw new HttpException(
      "Unauthorized: You need 'manage_moderators' permission to invite moderators",
      403,
    );
  }

  // Verify the user to be assigned exists as a moderator
  const moderatorToAssign =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        id: body.moderator_id,
        email_verified: true,
        deleted_at: null,
      },
    });

  if (!moderatorToAssign) {
    throw new HttpException("Moderator user not found or not verified", 404);
  }

  // Check if moderator is already assigned to this community
  const existingAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: body.moderator_id,
      },
    });

  if (existingAssignment) {
    throw new HttpException(
      "This moderator is already assigned to this community",
      409,
    );
  }

  // Check community has not exceeded 25 moderator limit
  const moderatorCount =
    await MyGlobal.prisma.reddit_like_community_moderators.count({
      where: {
        community_id: communityId,
      },
    });

  if (moderatorCount >= 25) {
    throw new HttpException(
      "Community has reached maximum of 25 moderators",
      400,
    );
  }

  // Apply default permissions if not specified
  const permissions =
    body.permissions !== undefined
      ? body.permissions
      : "manage_posts,manage_comments,access_reports";

  // Create moderator assignment
  const created = await MyGlobal.prisma.reddit_like_community_moderators.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: communityId,
        moderator_id: body.moderator_id,
        assigned_by_moderator_id: moderator.id,
        assigned_at: toISOStringSafe(new Date()),
        is_primary: false,
        permissions: permissions,
      },
    },
  );

  return {
    id: created.id,
    community_id: created.community_id,
    moderator_id: created.moderator_id,
    assigned_at: toISOStringSafe(created.assigned_at),
    is_primary: created.is_primary,
    permissions: created.permissions,
  };
}
