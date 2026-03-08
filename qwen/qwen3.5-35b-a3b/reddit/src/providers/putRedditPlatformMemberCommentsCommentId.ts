import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IUpdate;
}): Promise<IRedditPlatformComment> {
  // Retrieve the comment with full relationship data
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditPlatformCommentTransformer.select(),
    });
  // Verify ownership - only the comment author can edit
  if (comment.author.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if comment was already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Validate content field exists and is non-empty
  if (props.body.content === undefined || props.body.content === null) {
    throw new HttpException("Content is required", 400);
  }
  const trimmedContent = props.body.content.trim();
  if (trimmedContent.length === 0) {
    throw new HttpException("Content cannot be empty", 400);
  }
  if (trimmedContent.length > 10000) {
    throw new HttpException("Content too long", 400);
  }
  // Verify parent post exists and is not deleted if post_id is set
  if (comment.post !== null) {
    if (comment.post.deleted_at !== null) {
      throw new HttpException("Post has been deleted", 400);
    }
  }
  // Verify parent comment exists if parent_id is set
  if (comment.parent !== null) {
    if (comment.parent.deleted_at !== null) {
      throw new HttpException("Parent comment has been deleted", 400);
    }
  }
  // Update the comment
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      content: trimmedContent,
      updated_at: new Date(),
    },
  });
  // Fetch updated comment
  const updated =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditPlatformCommentTransformer.select(),
    });
  return await RedditPlatformCommentTransformer.transform(updated);
}
