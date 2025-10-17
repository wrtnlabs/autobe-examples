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

export async function getRedditLikeMemberPostsPostIdVotesMe(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostVote.IUserVoteStatus> {
  const { member, postId } = props;

  const vote = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      reddit_like_member_id: member.id,
      reddit_like_post_id: postId,
    },
  });

  if (vote) {
    return {
      voted: true,
      vote_value: vote.vote_value,
    };
  }

  return {
    voted: false,
    vote_value: undefined,
  };
}
