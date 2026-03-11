import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentVoteTransformer } from "../transformers/RedditLikeCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentVote.ICreate;
}): Promise<IRedditLikeCommentVote> {
  // Check comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true, author_id: true, deleted_at: true },
  });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is deleted", 400);
  }
  // Prevent self-voting
  if (comment.author_id === props.member.id) {
    throw new HttpException("Cannot vote on own comment", 403);
  }
  // upsert vote (replace existing vote if any)
  const vote = await MyGlobal.prisma.reddit_like_comment_votes.upsert({
    where: {
      reddit_like_comment_id_reddit_like_member_id: {
        reddit_like_comment_id: props.commentId,
        reddit_like_member_id: props.member.id,
      },
    },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      value: props.body.value ?? 0,
      created_at: new Date(),
      comment: { connect: { id: props.commentId } },
      member: { connect: { id: props.member.id } },
    },
    update: {
      value: props.body.value ?? 0,
    },
    ...RedditLikeCommentVoteTransformer.select(),
  });
  return await RedditLikeCommentVoteTransformer.transform(vote);
}
