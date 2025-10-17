import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditCommunityMemberPostsPostIdPostVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const { member, postId, voteId } = props;

  const vote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirstOrThrow({
      where: {
        id: voteId,
        post_id: postId,
        deleted_at: null,
      },
    });

  // Authorization check: vote must be cast by the requesting member
  if (vote.member_id !== member.id) {
    throw new HttpException("Forbidden: Access to this vote is denied", 403);
  }

  return {
    id: vote.id,
    member_id: vote.member_id,
    post_id: vote.post_id,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
