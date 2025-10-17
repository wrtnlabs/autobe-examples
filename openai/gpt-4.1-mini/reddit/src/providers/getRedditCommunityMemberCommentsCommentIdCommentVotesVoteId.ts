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

export async function getRedditCommunityMemberCommentsCommentIdCommentVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirstOrThrow({
      where: {
        id: props.voteId,
        comment_id: props.commentId,
        member_id: props.member.id,
        deleted_at: null,
      },
    });

  return {
    id: vote.id,
    member_id: vote.member_id,
    comment_id: vote.comment_id,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
