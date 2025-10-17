import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.ICreate;
}): Promise<IRedditLikeCommunityModerator> {
  const { admin, communityId, body } = props;

  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: communityId },
  });

  await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
    where: { id: body.moderator_id },
  });

  const existingAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: body.moderator_id,
      },
    });

  if (existingAssignment) {
    throw new HttpException(
      "Moderator is already assigned to this community",
      409,
    );
  }

  const moderatorCount =
    await MyGlobal.prisma.reddit_like_community_moderators.count({
      where: {
        community_id: communityId,
      },
    });

  if (moderatorCount >= 25) {
    throw new HttpException(
      "Community has reached maximum moderator limit of 25",
      400,
    );
  }

  const assignedAt = toISOStringSafe(new Date());
  const defaultPermissions = "manage_posts,manage_comments,access_reports";
  const permissions = body.permissions ?? defaultPermissions;

  const created = await MyGlobal.prisma.reddit_like_community_moderators.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: communityId,
        moderator_id: body.moderator_id,
        assigned_by_moderator_id: null,
        assigned_at: assignedAt,
        is_primary: false,
        permissions: permissions,
      },
    },
  );

  return {
    id: created.id,
    community_id: created.community_id,
    moderator_id: created.moderator_id,
    assigned_at: assignedAt,
    is_primary: false,
    permissions: permissions,
  };
}
