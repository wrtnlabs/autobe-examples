import { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchCommunityMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPostVote[];
}): Promise<ICommunityKarmaScore> {
  type LocalAction = {
    post_id: string;
    action: "create" | "update" | "delete";
    vote_type: "upvote" | "downvote";
  };
  const actions = props.body as unknown as LocalAction[];
  if (!Array.isArray(actions)) {
    throw new HttpException(
      "Request body must be an array of vote actions",
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    let karmaDelta = 0;
    const auditActions: any[] = [];
    for (const action of actions) {
      // Validate target post exists and is not deleted
      const post = await prisma.community_posts.findUnique({
        where: { id: action.post_id },
        select: { id: true, community_member_id: true },
      });
      if (!post) {
        throw new HttpException("Target post not found or deleted", 404);
      }
      // Validate user can't vote on their own post
      if (post.community_member_id === props.member.id) {
        throw new HttpException("Cannot vote on your own post", 403);
      }
      // Get existing vote if any
      const existingVote = await prisma.community_post_votes.findFirst({
        where: {
          member_id: props.member.id,
          post_id: action.post_id,
          deleted_at: null,
        },
      });
      // Handle action based on type
      if (action.action === "create") {
        if (existingVote) {
          // If already voted, this should be an update (not create)
          throw new HttpException(
            "Vote already exists, use update action",
            400,
          );
        }
        // Create new vote
        const created = await prisma.community_post_votes.create({
          data: {
            id: v4(),
            post: { connect: { id: action.post_id } },
            member: { connect: { id: props.member.id } },
            vote_type: action.vote_type,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        });
        // Adjust karma
        karmaDelta += action.vote_type === "upvote" ? 1 : -1;
        // Log audit
        auditActions.push({
          actor_id: props.member.id,
          actor_type: "member",
          action: action.action,
          target_type: "post",
          target_id: action.post_id,
          details: JSON.stringify({ vote_type: action.vote_type }),
          created_at: toISOStringSafe(new Date()),
        });
      } else if (action.action === "update") {
        if (!existingVote) {
          throw new HttpException("No existing vote to update", 404);
        }
        // Calculate delta from old to new
        const oldVoteType = existingVote.vote_type;
        const oldDelta = oldVoteType === "upvote" ? 1 : -1;
        const newDelta = action.vote_type === "upvote" ? 1 : -1;
        const changeInDelta = newDelta - oldDelta;
        // Update vote
        await prisma.community_post_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: action.vote_type,
            updated_at: toISOStringSafe(new Date()),
          },
        });
        // Adjust karma by change
        karmaDelta += changeInDelta;
        // Log audit
        auditActions.push({
          actor_id: props.member.id,
          actor_type: "member",
          action: action.action,
          target_type: "post",
          target_id: action.post_id,
          details: JSON.stringify({
            old_vote_type: oldVoteType,
            new_vote_type: action.vote_type,
          }),
          created_at: toISOStringSafe(new Date()),
        });
      } else if (action.action === "delete") {
        if (!existingVote) {
          throw new HttpException("No existing vote to delete", 404);
        }
        // Reverse karma impact
        const voteType = existingVote.vote_type;
        const delta = voteType === "upvote" ? 1 : -1;
        karmaDelta -= delta;
        // Soft delete vote
        await prisma.community_post_votes.update({
          where: { id: existingVote.id },
          data: {
            deleted_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
        // Log audit
        auditActions.push({
          actor_id: props.member.id,
          actor_type: "member",
          action: action.action,
          target_type: "post",
          target_id: action.post_id,
          details: JSON.stringify({ vote_type: voteType }),
          created_at: toISOStringSafe(new Date()),
        });
      } else {
        throw new HttpException(
          "Invalid action type. Must be create, update, or delete",
          400,
        );
      }
    }
    // Update karma score atomically
    const karma = await prisma.community_karma_scores.upsert({
      where: {
        actor_id_actor_type: {
          actor_id: props.member.id,
          actor_type: "member",
        },
      },
      update: {
        karma_score: { increment: karmaDelta },
        updated_at: toISOStringSafe(new Date()),
      },
      create: {
        id: v4(),
        actor_id: props.member.id,
        actor_type: "member",
        karma_score: karmaDelta,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
    // Log audit actions
    if (auditActions.length > 0) {
      await prisma.community_audit_logs.createMany({
        data: auditActions,
      });
    }
    return karma;
  });
}
