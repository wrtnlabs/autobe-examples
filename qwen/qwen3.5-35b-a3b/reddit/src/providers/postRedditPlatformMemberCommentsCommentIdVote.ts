import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommentVote.ICreate;
}): Promise<IRedditPlatformCommentVote> {
  // Validate comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, author_id: true, vote_score: true },
    });
  // Check member is not voting on their own comment
  if (comment.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 409);
  }
  // Get existing vote if any
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: props.member.id,
          comment_id: props.commentId,
        },
      },
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const voteType = props.body.vote_type;
  // Helper: calculate score from vote_type
  const calculateVoteScore = (vtype: string | null): number => {
    if (vtype === null) return 0;
    if (vtype === "UPVOTE") return 1;
    if (vtype === "DOWNVOTE") return -1;
    return 0;
  };
  // Handle vote removal (vote_type is null)
  if (voteType === null) {
    if (existingVote) {
      // Calculate score impact before deletion
      const oldVoteType = typia.assert<"UPVOTE" | "DOWNVOTE" | null>(
        existingVote.vote_type,
      );
      // Delete vote
      await MyGlobal.prisma.reddit_platform_comment_votes.delete({
        where: { id: existingVote.id },
      });
      // Recalculate comment score by fetching and summing votes
      const votes =
        await MyGlobal.prisma.reddit_platform_comment_votes.findMany({
          where: {
            comment_id: props.commentId,
            deleted_at: null,
          },
        });
      const scoreSum = votes.reduce(
        (sum, v) => sum + calculateVoteScore(v.vote_type),
        0,
      );
      // Update comment score
      await MyGlobal.prisma.reddit_platform_comments.update({
        where: { id: props.commentId },
        data: { vote_score: scoreSum },
      });
      // Adjust member karma
      if (oldVoteType === "UPVOTE") {
        await MyGlobal.prisma.reddit_platform_members.update({
          where: { id: props.member.id },
          data: { karma_score: { decrement: 1 } },
        });
      } else if (oldVoteType === "DOWNVOTE") {
        await MyGlobal.prisma.reddit_platform_members.update({
          where: { id: props.member.id },
          data: { karma_score: { increment: 1 } },
        });
      }
      // Refresh member and comment data for response
      const updatedMember =
        await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
          where: { id: props.member.id },
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        });
      const updatedComment =
        await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
          where: { id: props.commentId },
          select: {
            id: true,
            content: true,
            vote_score: true,
            author_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
      const updatedAuthor =
        await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
          where: { id: comment.author_id },
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        });
      return {
        id: existingVote.id,
        vote_type: null,
        created_at: toISOStringSafe(existingVote.created_at),
        updated_at: toISOStringSafe(existingVote.updated_at),
        deleted_at:
          existingVote.deleted_at !== null
            ? toISOStringSafe(existingVote.deleted_at)
            : null,
        member: {
          id: updatedMember.id as string & tags.Format<"uuid">,
          username: updatedMember.username,
          display_name: updatedMember.display_name,
          karma_score: updatedMember.karma_score as number & tags.Type<"int32">,
          is_active: updatedMember.is_active,
          created_at: toISOStringSafe(updatedMember.created_at),
        } satisfies IRedditPlatformMember.ISummary,
        comment: {
          id: updatedComment.id as string & tags.Format<"uuid">,
          content: updatedComment.content,
          vote_score: updatedComment.vote_score as number & tags.Type<"int32">,
          author: {
            id: updatedAuthor.id as string & tags.Format<"uuid">,
            username: updatedAuthor.username,
            display_name: updatedAuthor.display_name,
            karma_score: updatedAuthor.karma_score as number &
              tags.Type<"int32">,
            is_active: updatedAuthor.is_active,
            created_at: toISOStringSafe(updatedAuthor.created_at),
          } satisfies IRedditPlatformMember.ISummary,
          created_at: toISOStringSafe(updatedComment.created_at),
          updated_at: toISOStringSafe(updatedComment.updated_at),
          deleted_at:
            updatedComment.deleted_at !== null
              ? toISOStringSafe(updatedComment.deleted_at)
              : null,
        } satisfies IRedditPlatformComment.ISummary,
      };
    }
    throw new HttpException("Vote not found", 404);
  }
  // Handle create or update
  const isCreate = existingVote === null;
  const oldVoteType = isCreate
    ? null
    : typia.assert<"UPVOTE" | "DOWNVOTE" | null>(existingVote.vote_type);
  const upsertResult =
    await MyGlobal.prisma.reddit_platform_comment_votes.upsert({
      where: {
        user_id_comment_id: {
          user_id: props.member.id,
          comment_id: props.commentId,
        },
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: props.member.id,
        comment_id: props.commentId,
        vote_type: voteType,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        vote_type: voteType,
        updated_at: new Date(),
      },
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            author_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  // Recalculate comment score by fetching and summing votes
  const votes2 = await MyGlobal.prisma.reddit_platform_comment_votes.findMany({
    where: {
      comment_id: props.commentId,
      deleted_at: null,
    },
  });
  const scoreSum2 = votes2.reduce(
    (sum, v) => sum + calculateVoteScore(v.vote_type),
    0,
  );
  // Update comment score
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: { vote_score: scoreSum2 },
  });
  // Adjust member karma
  if (isCreate) {
    // New vote
    if (voteType === "UPVOTE") {
      await MyGlobal.prisma.reddit_platform_members.update({
        where: { id: props.member.id },
        data: { karma_score: { increment: 1 } },
      });
    } else if (voteType === "DOWNVOTE") {
      await MyGlobal.prisma.reddit_platform_members.update({
        where: { id: props.member.id },
        data: { karma_score: { decrement: 1 } },
      });
    }
  } else {
    // Vote changed
    if (oldVoteType === "UPVOTE" && voteType === "DOWNVOTE") {
      await MyGlobal.prisma.reddit_platform_members.update({
        where: { id: props.member.id },
        data: { karma_score: { decrement: 2 } },
      });
    } else if (oldVoteType === "DOWNVOTE" && voteType === "UPVOTE") {
      await MyGlobal.prisma.reddit_platform_members.update({
        where: { id: props.member.id },
        data: { karma_score: { increment: 2 } },
      });
    }
  }
  // Refresh member and comment data for response
  const updatedMember =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        karma_score: true,
        is_active: true,
        created_at: true,
      },
    });
  const updatedComment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        vote_score: true,
        author_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const updatedAuthor =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: comment.author_id },
      select: {
        id: true,
        username: true,
        display_name: true,
        karma_score: true,
        is_active: true,
        created_at: true,
      },
    });
  return {
    id: upsertResult.id,
    vote_type: upsertResult.vote_type as "UPVOTE" | "DOWNVOTE" | null,
    created_at: toISOStringSafe(upsertResult.created_at),
    updated_at: toISOStringSafe(upsertResult.updated_at),
    deleted_at:
      upsertResult.deleted_at !== null
        ? toISOStringSafe(upsertResult.deleted_at)
        : null,
    member: {
      id: updatedMember.id as string & tags.Format<"uuid">,
      username: updatedMember.username,
      display_name: updatedMember.display_name,
      karma_score: updatedMember.karma_score as number & tags.Type<"int32">,
      is_active: updatedMember.is_active,
      created_at: toISOStringSafe(updatedMember.created_at),
    } satisfies IRedditPlatformMember.ISummary,
    comment: {
      id: updatedComment.id as string & tags.Format<"uuid">,
      content: updatedComment.content,
      vote_score: updatedComment.vote_score as number & tags.Type<"int32">,
      author: {
        id: updatedAuthor.id as string & tags.Format<"uuid">,
        username: updatedAuthor.username,
        display_name: updatedAuthor.display_name,
        karma_score: updatedAuthor.karma_score as number & tags.Type<"int32">,
        is_active: updatedAuthor.is_active,
        created_at: toISOStringSafe(updatedAuthor.created_at),
      } satisfies IRedditPlatformMember.ISummary,
      created_at: toISOStringSafe(updatedComment.created_at),
      updated_at: toISOStringSafe(updatedComment.updated_at),
      deleted_at:
        updatedComment.deleted_at !== null
          ? toISOStringSafe(updatedComment.deleted_at)
          : null,
    } satisfies IRedditPlatformComment.ISummary,
  };
}
