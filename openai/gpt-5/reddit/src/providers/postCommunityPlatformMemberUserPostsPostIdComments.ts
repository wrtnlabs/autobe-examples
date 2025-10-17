import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postCommunityPlatformMemberUserPostsPostIdComments(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const { memberUser, postId, body } = props;

  // Authorization: ensure active membership and active user
  const membership =
    await MyGlobal.prisma.community_platform_member_users.findFirst({
      where: {
        community_platform_user_id: memberUser.id,
        deleted_at: null,
        user: { deleted_at: null },
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden: membership not active", 403);
  }

  // Verify target post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: {
      id: true,
      locked_at: true,
      archived_at: true,
      visibility_state: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (
    post.locked_at !== null ||
    post.archived_at !== null ||
    post.visibility_state === "Locked" ||
    post.visibility_state === "Archived"
  ) {
    throw new HttpException("Conflict: Post is locked or archived", 409);
  }

  // Parent validation (if provided)
  const parentId = body.parent_id ?? null;
  if (parentId !== null) {
    const parent = await MyGlobal.prisma.community_platform_comments.findFirst({
      where: {
        id: parentId,
        deleted_at: null,
      },
      select: { id: true, community_platform_post_id: true },
    });
    if (!parent) {
      throw new HttpException("Parent comment not found", 404);
    }
    if (parent.community_platform_post_id !== postId) {
      throw new HttpException(
        "Bad Request: Parent must belong to the same post",
        400,
      );
    }
  }

  // Prepare identifiers and timestamps
  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create comment
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: newId,
      community_platform_post_id: postId,
      community_platform_user_id: memberUser.id,
      parent_id: parentId,
      body: body.body,
      locked_at: null,
      edited_at: null,
      edit_count: 0,
      created_at: now,
      updated_at: now,
    },
    select: { edit_count: true },
  });

  const response = {
    id: newId,
    community_platform_post_id: postId,
    community_platform_user_id: memberUser.id,
    parent_id: parentId,
    body: body.body,
    locked_at: null,
    edited_at: null,
    edit_count: created.edit_count,
    created_at: now,
    updated_at: now,
  } satisfies ICommunityPlatformComment;
  return response;
}
