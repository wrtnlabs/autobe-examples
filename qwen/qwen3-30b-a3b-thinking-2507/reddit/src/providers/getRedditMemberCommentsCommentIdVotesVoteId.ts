import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
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

export async function getRedditMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditComment.IVote> {
  const vote = await MyGlobal.prisma.reddit_comment_votes.findUniqueOrThrow({
    where: {
      id: props.voteId,
      reddit_comment_id: props.commentId,
    },
    select: {
      vote_direction: true,
      reddit_member_id: true,
    },
  });
  if (vote.reddit_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return { vote: typia.assert<"up" | "down" | "remove">(vote.vote_direction) };
}
