import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommentVote";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommentAtSummaryTransformer } from "../transformers/RedditCommentAtSummaryTransformer";
import { RedditCommentTransformer } from "../transformers/RedditCommentTransformer";
import { RedditPostTextAtSummaryTransformer } from "../transformers/RedditPostTextAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommentVote.IUpdate;
}): Promise<IRedditComment> {
  // Verify vote exists
  const vote = await MyGlobal.prisma.reddit_comment_votes.findUniqueOrThrow({
    where: { id: props.voteId },
  });
  // Verify vote belongs to current member
  if (vote.reddit_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify vote belongs to correct comment
  if (vote.reddit_comment_id !== props.commentId) {
    throw new HttpException("Invalid vote for comment", 400);
  }
  const oldVote = vote.vote_direction;
  const newVote = props.body.vote;
  const voteDelta =
    (newVote === "up" ? 1 : newVote === "down" ? -1 : 0) -
    (oldVote === "up" ? 1 : oldVote === "down" ? -1 : 0);
  if (newVote === "remove") {
    await MyGlobal.prisma.reddit_comment_votes.delete({
      where: { id: props.voteId },
    });
  } else {
    await MyGlobal.prisma.reddit_comment_votes.update({
      where: { id: props.voteId },
      data: { vote_direction: newVote },
    });
  }
  // Update karma score for comment author
  // Get comment with associated post to find author_id
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      post: {
        select: {
          reddit_members_id: true,
        },
      },
    },
  });
  const authorId = comment.post.reddit_members_id;
  if (!authorId) {
    throw new HttpException("Author not found", 404);
  }
  await MyGlobal.prisma.reddit_profiles.update({
    where: { id: authorId },
    data: {
      karma: { increment: voteDelta },
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Corrected the select object to include all required properties
  const correctSelect = {
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: RedditPostTextAtSummaryTransformer.select(),
      parent: RedditCommentAtSummaryTransformer.select(),
      replies: RedditCommentAtSummaryTransformer.select(),
      snapshots: true,
      votes: true,
    },
  } satisfies Prisma.reddit_commentsFindManyArgs;
  const updatedComment =
    await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...correctSelect,
    });
  return await RedditCommentTransformer.transform(updatedComment);
}
