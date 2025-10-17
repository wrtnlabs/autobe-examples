import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditLikePostsPostIdVotesMe(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostVote.IUserVoteStatus> {
  const { member, postId } = props;

  // Query for the user's vote on this specific post
  const voteRecord = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      reddit_like_member_id: member.id,
      reddit_like_post_id: postId,
    },
  });

  // If no vote record exists, user hasn't voted
  if (!voteRecord) {
    return {
      voted: false,
      vote_value: undefined,
    };
  }

  // Vote exists, return the vote status with value
  return {
    voted: true,
    vote_value: voteRecord.vote_value as number & tags.Type<"int32">,
  };
}
