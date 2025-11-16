import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityCommentVotesRedditCommunityCommentVoteId(props: {
  admin: AdminPayload;
  redditCommunityCommentVoteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
    where: { id: props.redditCommunityCommentVoteId },
  });

  if (vote === null) {
    throw new HttpException("Reddit community comment vote not found", 404);
  }

  return {
    id: vote.id,
    reddit_community_comment_id: vote.reddit_community_comment_id,
    reddit_community_registered_user_id:
      vote.reddit_community_registered_user_id,
    vote: Number(vote.vote_type) satisfies number as number &
      tags.Type<"int32">,
    created_at: toISOStringSafe(vote.created_at) as string &
      tags.Format<"date-time">,
  };
}
