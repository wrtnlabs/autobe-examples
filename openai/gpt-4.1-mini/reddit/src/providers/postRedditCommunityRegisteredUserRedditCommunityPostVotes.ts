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

export async function postRedditCommunityRegisteredUserRedditCommunityPostVotes(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  const { registeredUser, body } = props;

  const postExists = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: body.reddit_community_post_id },
    select: { id: true },
  });

  if (!postExists) throw new HttpException("Post not found", 404);

  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_registered_user_id: registeredUser.id,
        reddit_community_post_id: body.reddit_community_post_id,
      },
    });

  if (existingVote)
    throw new HttpException("You have already voted on this post", 400);

  if (body.vote_value !== 1 && body.vote_value !== -1) {
    throw new HttpException("Invalid vote value", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_post_votes.create({
    data: {
      id: v4(),
      reddit_community_registered_user_id: registeredUser.id,
      reddit_community_post_id: body.reddit_community_post_id,
      vote_type: String(body.vote_value),
      created_at: now,
    },
  });

  return {
    id: created.id,
    redditCommunityRegisteredUserId:
      created.reddit_community_registered_user_id,
    redditCommunityPostId: created.reddit_community_post_id,
    vote: created.vote_type === "1" ? 1 : -1,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.created_at),
  };
}
