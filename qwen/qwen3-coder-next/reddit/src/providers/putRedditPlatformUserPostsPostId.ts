import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string;
  body: IRedditPlatformPost.IUpdate;
}): Promise<IRedditPlatformPost> {
  // Verify the post exists and belongs to the authenticated user
  const existingPost = await MyGlobal.prisma.reddit_platform_posts.findFirst({
    where: {
      id: props.postId,
      author_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!existingPost) {
    throw new HttpException("Post not found or access denied", 404);
  }
  // Since IRedditPlatformPost.IUpdate is empty ({}), we cannot access any of its properties
  // The only update we can safely perform is the updated_at timestamp
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Perform the update
  const updatedPost = await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Map the Prisma result to the expected return type
  return {
    id: updatedPost.id,
    author_id: updatedPost.author_id,
    community_id: updatedPost.community_id,
    created_at: toISOStringSafe(updatedPost.created_at),
    deleted_at: updatedPost.deleted_at
      ? toISOStringSafe(updatedPost.deleted_at)
      : null,
    comment_count: updatedPost.comment_count,
    content_text: updatedPost.content_text,
    updated_at: toISOStringSafe(updatedPost.updated_at),
    url: updatedPost.url,
    image_url: updatedPost.image_url,
    type: updatedPost.type,
    title: updatedPost.title,
    vote_score: updatedPost.vote_score,
  };
}
