import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
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

export async function getRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
}): Promise<IRedditLikePostVote.ISummary | null> {
  const vote = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      voter_id: props.member.id,
      post_id: props.postId,
    },
    select: {
      id: true,
      post_id: true,
      value: true,
      created_at: true,
    },
  });
  if (!vote) {
    return null;
  }
  return {
    id: vote.id as string & tags.Format<"uuid">,
    post_id: vote.post_id as string & tags.Format<"uuid">,
    value: vote.value as 1 | -1,
    created_at: vote.created_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
