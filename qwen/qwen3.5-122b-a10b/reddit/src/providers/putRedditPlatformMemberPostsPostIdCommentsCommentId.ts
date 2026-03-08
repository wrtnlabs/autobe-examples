import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function putRedditPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IUpdate;
}): Promise<IRedditPlatformComment> {
  // Verify comment exists and belongs to the specified post
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_platform_post_id: true,
        reddit_platform_member_id: true,
        body: true,
        deleted_at: true,
      },
    });
  // Verify comment belongs to the specified post
  if (comment.reddit_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Verify comment is not soft-deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted comment", 400);
  }
  // Verify comment author matches authenticated member (author-only edit)
  if (comment.reddit_platform_member_id !== props.member.id) {
    throw new HttpException(
      "Only the comment author can edit this comment",
      403,
    );
  }
  // Create edit history record
  const editId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_platform_comment_edits.create({
    data: {
      id: editId,
      reddit_platform_comment_id: props.commentId,
      reddit_platform_member_id: props.member.id,
      old_content: comment.body,
      new_content: props.body.body,
      created_at: new Date(),
    },
  });
  // Update comment body and updated_at timestamp
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: new Date(),
    },
  });
  // Fetch updated comment with transformer select
  const updated =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditPlatformCommentTransformer.select(),
    });
  // Transform and return
  return await RedditPlatformCommentTransformer.transform(updated);
}
