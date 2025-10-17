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

export async function putDiscussionBoardMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: IDiscussionBoardVote.IUpdate;
}): Promise<IDiscussionBoardVote> {
  const { member, voteId, body } = props;

  const existingVote =
    await MyGlobal.prisma.discussion_board_votes.findUniqueOrThrow({
      where: { id: voteId },
    });

  if (existingVote.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only modify your own votes",
      403,
    );
  }

  const voteCreatedAtTime = new Date(existingVote.created_at).getTime();
  const currentTime = Date.now();
  const minutesElapsed = (currentTime - voteCreatedAtTime) / (1000 * 60);

  if (minutesElapsed > 5) {
    throw new HttpException(
      "Vote modification window expired. Votes can only be changed within 5 minutes of casting.",
      400,
    );
  }

  if (body.vote_type === undefined) {
    await MyGlobal.prisma.discussion_board_votes.delete({
      where: { id: voteId },
    });

    return {
      id: existingVote.id as string & tags.Format<"uuid">,
      votable_type: existingVote.votable_type as "topic" | "reply",
      votable_id: existingVote.votable_id as string & tags.Format<"uuid">,
      vote_type: existingVote.vote_type as "upvote" | "downvote",
      created_at: toISOStringSafe(existingVote.created_at),
      updated_at: toISOStringSafe(existingVote.updated_at),
    };
  }

  const now = toISOStringSafe(new Date());

  const updatedVote = await MyGlobal.prisma.discussion_board_votes.update({
    where: { id: voteId },
    data: {
      vote_type: body.vote_type,
      updated_at: now,
    },
  });

  return {
    id: updatedVote.id as string & tags.Format<"uuid">,
    votable_type: updatedVote.votable_type as "topic" | "reply",
    votable_id: updatedVote.votable_id as string & tags.Format<"uuid">,
    vote_type: updatedVote.vote_type as "upvote" | "downvote",
    created_at: toISOStringSafe(updatedVote.created_at),
    updated_at: toISOStringSafe(updatedVote.updated_at),
  };
}
