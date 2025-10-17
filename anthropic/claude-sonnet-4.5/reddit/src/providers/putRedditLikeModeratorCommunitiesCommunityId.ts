import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditLikeModeratorCommunitiesCommunityId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunity.IUpdate;
}): Promise<IRedditLikeCommunity> {
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

  // Check moderator authorization
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

  // Verify manage_settings permission (primary moderators have all permissions)
  const isPrimary = moderatorAssignment.is_primary;
  const hasManageSettings =
    moderatorAssignment.permissions.includes("manage_settings");

  if (!isPrimary && !hasManageSettings) {
    throw new HttpException(
      "Unauthorized: You lack manage_settings permission for this community",
      403,
    );
  }

  // Update the community with inline data definition
  const updated = await MyGlobal.prisma.reddit_like_communities.update({
    where: {
      id: communityId,
    },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.icon_url !== undefined && { icon_url: body.icon_url ?? null }),
      ...(body.banner_url !== undefined && {
        banner_url: body.banner_url ?? null,
      }),
      ...(body.privacy_type !== undefined && {
        privacy_type: body.privacy_type,
      }),
      ...(body.posting_permission !== undefined && {
        posting_permission: body.posting_permission,
      }),
      ...(body.allow_text_posts !== undefined && {
        allow_text_posts: body.allow_text_posts,
      }),
      ...(body.allow_link_posts !== undefined && {
        allow_link_posts: body.allow_link_posts,
      }),
      ...(body.allow_image_posts !== undefined && {
        allow_image_posts: body.allow_image_posts,
      }),
      ...(body.primary_category !== undefined && {
        primary_category: body.primary_category,
      }),
      ...(body.secondary_tags !== undefined && {
        secondary_tags: body.secondary_tags ?? null,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return formatted community object with proper type conversions
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description,
    icon_url: updated.icon_url ?? undefined,
    banner_url: updated.banner_url ?? undefined,
    privacy_type: updated.privacy_type,
    posting_permission: updated.posting_permission,
    allow_text_posts: updated.allow_text_posts,
    allow_link_posts: updated.allow_link_posts,
    allow_image_posts: updated.allow_image_posts,
    primary_category: updated.primary_category,
    secondary_tags: updated.secondary_tags ?? undefined,
    subscriber_count: updated.subscriber_count,
    is_archived: updated.is_archived,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
