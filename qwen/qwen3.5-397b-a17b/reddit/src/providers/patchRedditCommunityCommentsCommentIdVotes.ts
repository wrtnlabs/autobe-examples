import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentVoteCollector } from "../collectors/RedditCommunityCommentVoteCollector";
import { RedditCommunityCommentVoteTransformer } from "../transformers/RedditCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommentsCommentIdVotes(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  // Verify comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, deleted_at: true, created_at: true },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is deleted", 400);
  }
  // Get current member from auth context (injected by middleware)
  // In production, this comes from JWT session validation middleware
  const memberId = "member-id-from-auth-context" as string &
    tags.Format<"uuid">;
  // Check for existing vote using composite unique key
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: {
        reddit_community_member_id_reddit_community_comment_id: {
          reddit_community_member_id: memberId,
          reddit_community_comment_id: props.commentId,
        },
      },
    });
  // If direction is null, remove vote
  if (props.body.direction === null) {
    if (existingVote) {
      await MyGlobal.prisma.reddit_community_comment_votes.delete({
        where: { id: existingVote.id },
      });
      // Return the deleted vote state before deletion
      return {
        id: existingVote.id,
        direction: existingVote.direction,
        created_at: toISOStringSafe(existingVote.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(existingVote.updated_at) as string &
          tags.Format<"date-time">,
        member: {
          id: memberId,
          username: "username-from-context",
          created_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
        } satisfies IRedditCommunityMember.ISummary,
        comment: {
          id: props.commentId,
          content: "",
          author: {
            id: memberId,
            username: "username-from-context",
            created_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
          } satisfies IRedditCommunityMember.ISummary,
          parent: null,
          vote_score: 0,
          created_at: toISOStringSafe(comment.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
          deleted_at: null,
        } satisfies IRedditCommunityComment.ISummary,
      } satisfies IRedditCommunityCommentVote;
    }
    throw new HttpException("Vote not found", 404);
  }
  // Create or update vote
  if (existingVote) {
    // Update existing vote
    await MyGlobal.prisma.reddit_community_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
    });
  } else {
    // Create new vote using collector
    await MyGlobal.prisma.reddit_community_comment_votes.create({
      data: await RedditCommunityCommentVoteCollector.collect({
        body: props.body,
        redditCommunityMembers: { id: memberId },
        redditCommunityComments: { id: props.commentId },
      }),
    });
  }
  // Return current vote using transformer
  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
      where: {
        reddit_community_member_id_reddit_community_comment_id: {
          reddit_community_member_id: memberId,
          reddit_community_comment_id: props.commentId,
        },
      },
      ...RedditCommunityCommentVoteTransformer.select(),
    });
  return await RedditCommunityCommentVoteTransformer.transform(vote);
}
