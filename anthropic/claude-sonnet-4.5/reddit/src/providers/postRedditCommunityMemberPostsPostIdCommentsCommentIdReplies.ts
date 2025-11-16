import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberPostsPostIdCommentsCommentIdReplies(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.deleted_at !== null) {
    throw new HttpException("Cannot reply to deleted post", 400);
  }

  const parentComment =
    await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!parentComment) {
    throw new HttpException("Parent comment not found", 404);
  }

  if (parentComment.deleted_at !== null) {
    throw new HttpException("Cannot reply to deleted comment", 400);
  }

  if (parentComment.reddit_community_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to specified post", 400);
  }

  if (
    props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null &&
    props.body.parent_comment_id !== props.commentId
  ) {
    throw new HttpException("Parent comment ID mismatch", 400);
  }

  const now = new Date();
  const replyDepth = parentComment.depth + 1;
  const replyId: string & tags.Format<"uuid"> = v4();

  const createdReply = await MyGlobal.prisma.reddit_community_comments.create({
    data: {
      id: replyId,
      body: props.body.body,
      reddit_community_post_id: props.postId,
      reddit_community_member_id: props.member.id,
      parent_comment_id: props.commentId,
      depth: replyDepth,
      edited: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: createdReply.id,
    body: createdReply.body,
    reddit_community_post_id: createdReply.reddit_community_post_id,
    reddit_community_member_id: createdReply.reddit_community_member_id,
    parent_comment_id: createdReply.parent_comment_id,
    depth: createdReply.depth,
    edited: createdReply.edited,
    created_at: toISOStringSafe(createdReply.created_at),
    updated_at: toISOStringSafe(createdReply.updated_at),
    deleted_at: createdReply.deleted_at
      ? toISOStringSafe(createdReply.deleted_at)
      : null,
  };
}
