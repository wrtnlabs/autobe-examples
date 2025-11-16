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

export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.reddit_community_member_id !== props.member.id) {
    throw new HttpException("You can only edit your own comments", 403);
  }

  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted comment", 403);
  }

  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 404);
  }

  await MyGlobal.prisma.reddit_community_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_comment_id: comment.id,
      body: comment.body,
      created_at: new Date(),
    },
  });

  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      edited: true,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    body: updated.body,
    reddit_community_post_id: updated.reddit_community_post_id,
    reddit_community_member_id: updated.reddit_community_member_id,
    parent_comment_id: updated.parent_comment_id,
    depth: updated.depth,
    edited: updated.edited,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
