import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberVotes(props: {
  member: MemberPayload;
  body: IDiscussionBoardVote.ICreate;
}): Promise<IDiscussionBoardVote> {
  const { member, body } = props;
  const memberId = member.id;

  // Validate votable content exists and is not deleted
  if (body.votable_type === "topic") {
    const topic = await MyGlobal.prisma.discussion_board_topics.findFirst({
      where: {
        id: body.votable_id,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });

    if (!topic) {
      throw new HttpException("Topic not found or has been deleted", 404);
    }

    // Prevent self-voting
    if (topic.discussion_board_member_id === memberId) {
      throw new HttpException("You cannot vote on your own content", 403);
    }
  } else if (body.votable_type === "reply") {
    const reply = await MyGlobal.prisma.discussion_board_replies.findFirst({
      where: {
        id: body.votable_id,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });

    if (!reply) {
      throw new HttpException("Reply not found or has been deleted", 404);
    }

    // Prevent self-voting
    if (reply.discussion_board_member_id === memberId) {
      throw new HttpException("You cannot vote on your own content", 403);
    }
  }

  // Check for existing vote (duplicate prevention)
  const existingVote = await MyGlobal.prisma.discussion_board_votes.findFirst({
    where: {
      discussion_board_member_id: memberId,
      votable_type: body.votable_type,
      votable_id: body.votable_id,
      deleted_at: null,
    },
  });

  if (existingVote) {
    throw new HttpException("You have already voted on this content", 409);
  }

  // Get member reputation for validation
  const reputation =
    await MyGlobal.prisma.discussion_board_user_reputation.findFirst({
      where: {
        discussion_board_member_id: memberId,
      },
      select: {
        total_score: true,
      },
    });

  const reputationScore = reputation?.total_score ?? 0;

  // Validate reputation requirements
  if (body.vote_type === "upvote" && reputationScore < 10) {
    throw new HttpException(
      "Insufficient reputation: Upvoting requires minimum 10 reputation points",
      403,
    );
  }

  if (body.vote_type === "downvote" && reputationScore < 50) {
    throw new HttpException(
      "Insufficient reputation: Downvoting requires minimum 50 reputation points",
      403,
    );
  }

  // Create vote record
  const now = toISOStringSafe(new Date());
  const voteId = v4() as string & tags.Format<"uuid">;

  const createdVote = await MyGlobal.prisma.discussion_board_votes.create({
    data: {
      id: voteId,
      discussion_board_member_id: memberId,
      votable_type: body.votable_type,
      votable_id: body.votable_id,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
    },
  });

  // Return response matching IDiscussionBoardVote interface
  return {
    id: createdVote.id as string & tags.Format<"uuid">,
    votable_type: createdVote.votable_type as "topic" | "reply",
    votable_id: createdVote.votable_id as string & tags.Format<"uuid">,
    vote_type: createdVote.vote_type as "upvote" | "downvote",
    created_at: toISOStringSafe(createdVote.created_at),
    updated_at: toISOStringSafe(createdVote.updated_at),
  };
}
