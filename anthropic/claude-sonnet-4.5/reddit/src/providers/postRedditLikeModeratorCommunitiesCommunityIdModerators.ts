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

export async function postRedditLikeModeratorCommunitiesCommunityIdModerators(props: {
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
    throw new HttpException("Community not found or has been deleted", 404);
  }

  // Verify requesting moderator has permission to manage moderators
  const requestingModeratorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!requestingModeratorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Check if requesting moderator has manage_moderators permission or is primary
  const hasManagePermission =
    requestingModeratorAssignment.is_primary ||
    requestingModeratorAssignment.permissions.includes("manage_moderators");

  if (!hasManagePermission) {
    throw new HttpException(
      "Unauthorized: You need 'manage_moderators' permission to assign moderators",
      403,
    );
  }

  // Verify invited moderator exists, is verified, and not deleted
  const invitedModerator =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        id: body.moderator_id,
        email_verified: true,
        deleted_at: null,
      },
    });

  if (!invitedModerator) {
    throw new HttpException(
      "Invited moderator not found, not verified, or has been deleted",
      404,
    );
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

  // Enforce 25 moderator limit
  const moderatorCount =
    await MyGlobal.prisma.reddit_like_community_moderators.count({
      where: {
        community_id: communityId,
      },
    });

  if (moderatorCount >= 25) {
    throw new HttpException(
      "Community has reached the maximum limit of 25 moderators",
      400,
    );
  }

  // Create moderator assignment
  const defaultPermissions = "manage_posts,manage_comments,access_reports";
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_like_community_moderators.create(
    {
      data: {
        id: v4(),
        community_id: communityId,
        moderator_id: body.moderator_id,
        assigned_by_moderator_id: moderator.id,
        assigned_at: now,
        is_primary: false,
        permissions: body.permissions ?? defaultPermissions,
      },
    },
  );

  // Return properly typed response
  return {
    id: created.id,
    community_id: created.community_id,
    moderator_id: created.moderator_id,
    assigned_at: toISOStringSafe(created.assigned_at),
    is_primary: created.is_primary,
    permissions: created.permissions,
  };
}
