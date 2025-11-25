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

export async function putRedditCommunityRegisteredUserRedditCommunityPostsPostIdPostVotesPostVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  postVoteId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  const existing = await MyGlobal.prisma.reddit_community_post_votes.findFirst({
    where: {
      id: props.postVoteId,
      reddit_community_post_id: props.postId,
      reddit_community_registereduser_id: props.registeredUser.id,
    },
  });

  if (!existing) {
    throw new HttpException("Post vote not found", 404);
  }

  const updated = await MyGlobal.prisma.reddit_community_post_votes.update({
    where: {
      id: props.postVoteId,
    },
    data: {
      vote_type: props.body.vote_type,
      deleted_at: props.body.deleted_at ?? null,
    },
  });

  return {
    id: updated.id,
    reddit_community_post_id: updated.reddit_community_post_id,
    reddit_community_registereduser_id:
      updated.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      updated.reddit_community_registereduser_session_id,
    vote_type: updated.vote_type,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
