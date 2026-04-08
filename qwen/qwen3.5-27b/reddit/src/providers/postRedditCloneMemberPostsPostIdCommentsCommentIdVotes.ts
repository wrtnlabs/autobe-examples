import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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

export async function postRedditCloneMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneCommentVote.ICreate;
}): Promise<IRedditCloneComment> {
  // Verify comment exists and belongs to postId
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: {
        id: props.commentId,
        reddit_clone_post_id: props.postId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    },
  );
  // Check if comment is soft-deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Upsert vote: update if exists, create if not
  await MyGlobal.prisma.reddit_clone_comment_votes.upsert({
    where: {
      reddit_clone_member_id_reddit_clone_comment_id: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_comment_id: props.commentId,
      },
    },
    create: {
      id: v4(),
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
      comment: { connect: { id: props.commentId } },
    },
    update: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
  });
  // Fetch updated comment with vote score
  const updatedComment =
    await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCloneCommentTransformer.select(),
    });
  return await RedditCloneCommentTransformer.transform(updatedComment);
}
