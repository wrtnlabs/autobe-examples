import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // Step 1: Fetch the post by id (not deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: props.postId, deleted_at: null },
  });
  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Step 2: Verify moderator's assignment to this community
  const assignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: post.community_platform_community_id,
        deleted_at: null,
        status: "active",
      },
    });
  if (!assignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator for this community",
      403,
    );
  }

  // Step 3: Prepare update fields, update updated_at
  const now = toISOStringSafe(new Date());
  const updateData = {
    title: props.body.title !== undefined ? props.body.title : undefined,
    content_body:
      props.body.content_body !== undefined
        ? props.body.content_body
        : undefined,
    content_type:
      props.body.content_type !== undefined
        ? props.body.content_type
        : undefined,
    status: props.body.status !== undefined ? props.body.status : undefined,
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });

  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id: updated.community_platform_community_id,
    title: updated.title,
    content_body:
      updated.content_body !== null ? updated.content_body : undefined,
    content_type: updated.content_type,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
