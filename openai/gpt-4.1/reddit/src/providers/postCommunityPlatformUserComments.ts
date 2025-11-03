import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const { user, body } = props;
  const now = toISOStringSafe(new Date());

  let post_id: string & tags.Format<"uuid">;
  let parent_comment_id: (string & tags.Format<"uuid">) | null | undefined;
  let nest_depth: number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Maximum<10>;

  if (body.parent_comment_id !== undefined && body.parent_comment_id !== null) {
    // Nested comment: validate the parent
    const parent = await MyGlobal.prisma.community_platform_comments.findUnique(
      {
        where: { id: body.parent_comment_id },
      },
    );
    if (!parent || parent.is_removed) {
      throw new HttpException(
        "Parent comment not found or has been removed",
        404,
      );
    }
    if (parent.nest_depth >= 5) {
      throw new HttpException("Max nesting depth (5) reached", 400);
    }
    post_id = parent.post_id;
    parent_comment_id = parent.id;
    const depthNum = parent.nest_depth + 1;
    nest_depth = depthNum as number &
      tags.Type<"int32"> &
      tags.Minimum<0> &
      tags.Maximum<10>;
  } else if (body.post_id !== undefined && body.post_id !== null) {
    // Top-level comment: validate the post
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: body.post_id, deleted_at: null },
    });
    if (!post) {
      throw new HttpException("Post not found or has been deleted", 404);
    }
    post_id = post.id;
    parent_comment_id = null;
    nest_depth = 0 as number &
      tags.Type<"int32"> &
      tags.Minimum<0> &
      tags.Maximum<10>;
  } else {
    throw new HttpException(
      "Either post_id or parent_comment_id must be provided",
      400,
    );
  }

  const comment = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id,
      user_id: user.id,
      user_session_id: user.session_id,
      parent_comment_id: parent_comment_id ?? null,
      body: body.body,
      nest_depth: nest_depth,
      is_removed: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: comment.id,
    post_id: comment.post_id,
    user_id: comment.user_id,
    user_session_id: comment.user_session_id,
    parent_comment_id: comment.parent_comment_id ?? null,
    body: comment.body,
    nest_depth: comment.nest_depth,
    is_removed: comment.is_removed,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
