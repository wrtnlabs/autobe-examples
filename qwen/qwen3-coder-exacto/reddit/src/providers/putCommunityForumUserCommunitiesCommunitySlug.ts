import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityForumUserCommunitiesCommunitySlug(props: {
  user: UserPayload;
  communitySlug: string;
  body: ICommunityForumCommunityGroup.IUpdate;
}): Promise<ICommunityForumCommunityGroup> {
  // Find the community by slug
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        slug: props.communitySlug,
      },
    });

  // Check if community exists
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Check authorization - only creator or admin can update
  if (community.created_by_id !== props.user.id) {
    throw new HttpException(
      "You don't have permission to update this community",
      403,
    );
  }

  // Update the community
  const updated = await MyGlobal.prisma.community_forum_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.slug !== undefined && { slug: props.body.slug }),
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.rules !== undefined && { rules: props.body.rules }),
      ...(props.body.privacy_level !== undefined && {
        privacy_level: props.body.privacy_level,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.updated_by_id !== undefined && {
        updated_by_id: props.body.updated_by_id,
      }),
      ...(props.body.deleted_at !== undefined && {
        deleted_at: props.body.deleted_at
          ? new Date(props.body.deleted_at)
          : null,
      }),
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });

  // Return the updated community
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    title: updated.title,
    description: updated.description,
    rules: updated.rules,
    privacy_level: updated.privacy_level as "public" | "private" | "restricted",
    status: updated.status as "active" | "inactive" | "archived",
    member_count: updated.member_count,
    post_count: updated.post_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    created_by_id: updated.created_by_id,
    updated_by_id: updated.updated_by_id ? updated.updated_by_id : undefined,
  };
}
