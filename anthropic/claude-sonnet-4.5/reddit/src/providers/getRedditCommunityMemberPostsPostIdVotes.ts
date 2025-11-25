import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findFirst({
    where: {
      reddit_community_post_id: props.postId,
      reddit_community_member_id: props.member.id,
    },
  });

  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }

  return {
    id: vote.id,
    post_id: vote.reddit_community_post_id,
    member_id: vote.reddit_community_member_id,
    vote_type: vote.vote_type as 1 | -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
