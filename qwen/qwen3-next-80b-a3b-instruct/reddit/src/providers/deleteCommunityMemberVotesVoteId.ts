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

export async function deleteCommunityMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query both possible vote tables for the voteId
  const postVote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: { id: props.voteId },
    select: { member_id: true, deleted_at: true },
  });
  const commentVote = await MyGlobal.prisma.community_comment_votes.findUnique({
    where: { id: props.voteId },
    select: { community_member_id: true },
  });
  // Determine which table the vote belongs to and extract appropriate member identifier
  let vote: {
    member_id: string;
    deleted_at: string | null;
    table: "post" | "comment";
  } | null = null;
  if (postVote) {
    vote = {
      member_id: postVote.member_id,
      deleted_at: postVote.deleted_at
        ? toISOStringSafe(postVote.deleted_at)
        : null,
      table: "post",
    };
  } else if (commentVote) {
    vote = {
      member_id: commentVote.community_member_id,
      deleted_at: null,
      table: "comment",
    };
  }
  // If vote doesn't exist, return 404
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // If vote already deleted, nothing to do (soft delete is idempotent)
  if (vote.deleted_at !== null) {
    return;
  }
  // Authorization: vote must belong to requesting member
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft delete by setting deleted_at to current ISO timestamp
  const isoDate: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  if (vote.table === "post") {
    await MyGlobal.prisma.community_post_votes.update({
      where: { id: props.voteId },
      data: { deleted_at: isoDate },
    });
  } else {
    await MyGlobal.prisma.community_comment_votes.update({
      where: { id: props.voteId },
      data: { deleted_at: isoDate } as any,
    });
  }
}
