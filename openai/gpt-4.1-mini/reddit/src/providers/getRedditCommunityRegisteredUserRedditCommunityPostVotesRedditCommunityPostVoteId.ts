import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityPostVotesRedditCommunityPostVoteId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityPostVoteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const postVote = await MyGlobal.prisma.reddit_community_post_votes.findUnique(
    {
      where: { id: props.redditCommunityPostVoteId },
    },
  );

  if (postVote === null) {
    throw new HttpException("Reddit community post vote not found", 404);
  }

  return {
    id: postVote.id,
    redditCommunityRegisteredUserId:
      postVote.reddit_community_registered_user_id,
    redditCommunityPostId: postVote.reddit_community_post_id,
    vote: (postVote.vote_type === "1" ? 1 : -1) as 1 | -1,
    createdAt: toISOStringSafe(postVote.created_at),
    updatedAt: toISOStringSafe(postVote.created_at),
  };
}
