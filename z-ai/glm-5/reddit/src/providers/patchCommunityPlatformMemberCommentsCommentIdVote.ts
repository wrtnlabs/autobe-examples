import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.IRequest;
}): Promise<ICommunityPlatformComment> {
  // Fetch the comment with post relation to get community for ban check
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true,
      author_id: true,
      post: {
        select: {
          community_id: true,
        },
      },
      deleted_at: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 410);
  }
  // Check if member is banned from the community
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        community_id: comment.post.community_id,
        banned_user_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Query existing vote
  const existingVote =
    await MyGlobal.prisma.community_platform_votes.findUnique({
      where: {
        comment_id_member_id: {
          comment_id: props.commentId,
          member_id: props.member.id,
        },
      },
    });
  const newVoteType = props.body.voteType;
  // Calculate karma delta and determine action
  let karmaDelta = 0;
  let voteAction: "create" | "update" | "delete" | "none" = "none";
  let voteTypeToSet: "upvote" | "downvote" | null = null;
  if (existingVote === null) {
    if (newVoteType === null) {
      voteAction = "none";
    } else {
      karmaDelta = newVoteType === "upvote" ? 1 : -1;
      voteAction = "create";
      voteTypeToSet = newVoteType;
    }
  } else {
    if (newVoteType === null) {
      karmaDelta = existingVote.vote_type === "upvote" ? -1 : 1;
      voteAction = "delete";
    } else if (existingVote.vote_type === newVoteType) {
      voteAction = "none";
    } else {
      karmaDelta =
        existingVote.vote_type === "upvote" && newVoteType === "downvote"
          ? -2
          : 2;
      voteAction = "update";
      voteTypeToSet = newVoteType;
    }
  }
  const now = new Date();
  // Execute all database operations in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (voteAction === "create") {
      await tx.community_platform_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          comment_id: props.commentId,
          post_id: null,
          vote_type: voteTypeToSet!,
          created_at: now,
          updated_at: now,
        },
      });
    } else if (voteAction === "update") {
      await tx.community_platform_votes.update({
        where: { id: existingVote!.id },
        data: {
          vote_type: voteTypeToSet!,
          updated_at: now,
        },
      });
    } else if (voteAction === "delete") {
      await tx.community_platform_votes.delete({
        where: { id: existingVote!.id },
      });
    }
    // Recalculate comment score
    const votes = await tx.community_platform_votes.findMany({
      where: { comment_id: props.commentId },
      select: { vote_type: true },
    });
    const newScore = votes.reduce((sum, v) => {
      return sum + (v.vote_type === "upvote" ? 1 : -1);
    }, 0);
    await tx.community_platform_comments.update({
      where: { id: props.commentId },
      data: { score: newScore },
    });
    // Update author karma if needed
    if (karmaDelta !== 0) {
      await tx.community_platform_members.update({
        where: { id: comment.author_id },
        data: {
          karma: {
            increment: karmaDelta,
          },
        },
      });
    }
  });
  // Fetch and transform the updated comment
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...CommunityPlatformCommentTransformer.select(),
    });
  return await CommunityPlatformCommentTransformer.transform(updatedComment);
}
