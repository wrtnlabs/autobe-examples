import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, voteId } = props;

  // Fetch the vote record with ownership and deletion status validation
  const vote = await MyGlobal.prisma.discussion_board_votes.findFirst({
    where: {
      id: voteId,
      deleted_at: null,
    },
  });

  // Vote must exist and not be soft-deleted
  if (!vote) {
    throw new HttpException("Vote not found or already deleted", 404);
  }

  // Validate ownership - member must own this vote
  if (vote.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own votes",
      403,
    );
  }

  // Enforce 5-minute change window business rule
  // Prisma returns DateTime as Date object, use getTime() immediately
  const voteCreatedAtMs = vote.created_at.getTime();
  const fiveMinutesInMs = 5 * 60 * 1000;
  const expirationTimeMs = voteCreatedAtMs + fiveMinutesInMs;
  const currentTimeMs = Date.now();

  if (currentTimeMs > expirationTimeMs) {
    throw new HttpException(
      "Vote deletion not allowed: 5-minute change window has expired. Votes can only be removed within 5 minutes of casting.",
      400,
    );
  }

  // Perform hard delete (permanent removal)
  await MyGlobal.prisma.discussion_board_votes.delete({
    where: { id: voteId },
  });

  // Vote successfully deleted - void return
}
