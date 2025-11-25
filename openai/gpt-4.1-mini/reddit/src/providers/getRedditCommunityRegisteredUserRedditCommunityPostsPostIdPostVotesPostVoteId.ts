import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityPostsPostIdPostVotesPostVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findUnique({
    where: { id: props.postVoteId },
  });

  if (vote === null || vote.reddit_community_post_id !== props.postId) {
    throw new HttpException("Post vote not found", 404);
  }

  if (vote.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (vote.deleted_at !== null && vote.deleted_at !== undefined) {
    throw new HttpException("Post vote is deleted", 404);
  }

  return {
    id: vote.id,
    reddit_community_post_id: vote.reddit_community_post_id,
    reddit_community_registereduser_id: vote.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      vote.reddit_community_registereduser_session_id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    deleted_at:
      vote.deleted_at === null || vote.deleted_at === undefined
        ? undefined
        : toISOStringSafe(vote.deleted_at),
  };
}
