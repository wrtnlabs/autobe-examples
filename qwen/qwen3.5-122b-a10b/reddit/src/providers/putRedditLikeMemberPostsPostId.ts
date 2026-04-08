import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IUpdate;
}): Promise<IRedditLikePost> {
  // 1. Fetch post and verify it exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_like_member_id: true,
      deleted_at: true,
      content_type: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post has been deleted", 404);
  }
  // 2. Verify ownership
  if (post.reddit_like_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate content based on content_type
  // Image posts cannot be updated via this endpoint
  if (post.content_type === "image") {
    throw new HttpException(
      "Image posts cannot be updated via this endpoint",
      400,
    );
  }
  // Validate title if provided
  if (props.body.title !== undefined) {
    const trimmedTitle = props.body.title.trim();
    if (trimmedTitle.length === 0) {
      throw new HttpException("Title cannot be empty", 400);
    }
    if (trimmedTitle.length > 500) {
      throw new HttpException(
        "Title exceeds maximum length of 500 characters",
        400,
      );
    }
  }
  // Validate content_text for text posts
  if (post.content_type === "text" && props.body.content_text !== undefined) {
    if (
      props.body.content_text === null ||
      props.body.content_text.trim().length === 0
    ) {
      throw new HttpException("Text post content cannot be empty", 400);
    }
    if (props.body.content_text.length > 10000) {
      throw new HttpException(
        "Content text exceeds maximum length of 10000 characters",
        400,
      );
    }
  }
  // Validate content_url for link posts
  if (post.content_type === "link" && props.body.content_url !== undefined) {
    if (
      props.body.content_url === null ||
      props.body.content_url.trim().length === 0
    ) {
      throw new HttpException("Link post content URL cannot be empty", 400);
    }
    if (props.body.content_url.length > 80000) {
      throw new HttpException(
        "Content URL exceeds maximum length of 80000 characters",
        400,
      );
    }
  }
  // 4. Perform the update
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title.trim() }),
      ...(props.body.content_text !== undefined && {
        content_text: props.body.content_text,
      }),
      ...(props.body.content_url !== undefined && {
        content_url: props.body.content_url,
      }),
      updated_at: new Date(),
    },
  });
  // 5. Fetch the updated post with all relations
  const updated = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...RedditLikePostTransformer.select(),
  });
  // 6. Transform and return
  return await RedditLikePostTransformer.transform(updated);
}
