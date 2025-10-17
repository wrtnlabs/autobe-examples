import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditCommunityMemberCommentsCommentIdCommentVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  const { member, commentId, voteId, body } = props;

  if (![1, 0, -1].includes(body.vote_value) === false) {
    throw new HttpException(
      "Bad Request: vote_value must be one of 1, 0, -1",
      400,
    );
  }

  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
      where: { id: voteId },
    });

  if (existingVote.comment_id !== commentId) {
    throw new HttpException(
      "Not Found: Vote does not belong to specified comment",
      404,
    );
  }

  if (existingVote.member_id !== member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own vote",
      403,
    );
  }

  const updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_comment_votes.update({
    where: { id: voteId },
    data: {
      vote_value: body.vote_value,
      updated_at: updated_at,
    },
  });

  return {
    id: updated.id,
    member_id: updated.member_id,
    comment_id: updated.comment_id,
    vote_value: updated.vote_value,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated_at,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
