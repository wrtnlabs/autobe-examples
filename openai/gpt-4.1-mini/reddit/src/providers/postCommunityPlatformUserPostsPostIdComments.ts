import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostCommentCollector } from "../collectors/CommunityPlatformPostCommentCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostsPostIdComments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.ICreate;
}): Promise<ICommunityPlatformPostComment> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) throw new HttpException("Post not found", 404);
  // Since 'parentCommentId' does not exist on ICreate, remove related code
  // Since 'contentText' does not exist on ICreate, we cannot validate contentText directly
  // Assuming CommunityPlatformPostCommentCollector.collect will handle validation
  const userEntity = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.user.id },
  });
  if (!userEntity) {
    throw new HttpException("User not found", 404);
  }
  const commentCreateInput =
    await CommunityPlatformPostCommentCollector.collect({
      body: props.body,
      post: post,
      user: userEntity,
    });
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_post_comments.create(
    {
      data: {
        ...commentCreateInput,
        created_at: now,
        updated_at: now,
      },
    },
  );
  return {
    id: created.id,
    post_id: created.post_id,
    user_id: created.user_id,
    parent_comment_id: created.parent_comment_id,
    content_text: created.content_text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
