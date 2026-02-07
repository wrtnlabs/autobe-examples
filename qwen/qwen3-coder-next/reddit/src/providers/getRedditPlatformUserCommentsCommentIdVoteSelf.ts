import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserCommentsCommentIdVoteSelf(props: {
  user: UserPayload;
  commentId: string;
}): Promise<IRedditPlatformCommentVote> {
  const vote = await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
    where: {
      comment_id: props.commentId,
      user_id: props.user.id,
    },
  });
  if (!vote) {
    throw new HttpException("Not found", 404);
  }
  return {
    id: vote.id as string & tags.Format<"uuid">,
    user_id: vote.user_id as string & tags.Format<"uuid">,
    comment_id: vote.comment_id as string & tags.Format<"uuid">,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(vote.updated_at) as string &
      tags.Format<"date-time">,
  };
}
