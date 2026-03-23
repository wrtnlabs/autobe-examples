import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  // Validate comment existence and get ownership info
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        deleted_at: true,
        reddit_clone_post_id: true,
        content: true,
        score: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  // Validate ownership - only author can edit
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate comment is not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is deleted", 409);
  }
  // Validate post matches (comment must belong to the specified post)
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Comment not found in post", 404);
  }
  // Create snapshot before update for audit trail
  if (props.body.content !== undefined) {
    await MyGlobal.prisma.reddit_clone_comment_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_clone_comment_id: comment.id,
        reddit_clone_member_id: comment.reddit_clone_member_id,
        reddit_clone_post_id: comment.reddit_clone_post_id,
        reddit_clone_comment_parent_id: null,
        content: comment.content,
        vote_score: comment.score,
        comment_created_at: comment.created_at,
        comment_updated_at: comment.updated_at,
        comment_deleted_at: comment.deleted_at,
        snapshot_created_at: new Date(),
      },
    });
  }
  // Update comment
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  // Fetch updated comment with full relations
  const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      ...RedditCloneCommentTransformer.select(),
    },
  );
  return await RedditCloneCommentTransformer.transform(updated);
}
