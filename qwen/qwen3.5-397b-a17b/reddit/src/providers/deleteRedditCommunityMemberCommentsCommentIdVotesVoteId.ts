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

export async function deleteRedditCommunityMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
    where: { id: props.voteId },
    select: {
      id: true,
      member_id: true,
      comment_id: true,
      deleted_at: true,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote already deleted", 404);
  }
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (vote.comment_id !== props.commentId) {
    throw new HttpException("Vote does not belong to this comment", 400);
  }
  await MyGlobal.prisma.reddit_community_comment_votes.update({
    where: { id: props.voteId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
