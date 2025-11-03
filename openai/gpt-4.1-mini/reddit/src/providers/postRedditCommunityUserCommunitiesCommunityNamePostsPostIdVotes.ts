import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserCommunitiesCommunityNamePostsPostIdVotes(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  const { user, communityName, postId, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: { id: postId, reddit_community_community_id: community.id },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found in the given community", 404);
  }

  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_post_id: post.id,
        reddit_community_user_id: user.id,
        reddit_community_community_id: community.id,
      },
      select: { id: true },
    });
  if (existingVote) {
    throw new HttpException("Vote already exists", 409);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_post_votes.create({
    data: {
      id: v4(),
      reddit_community_post_id: body.reddit_community_post_id,
      reddit_community_user_id: body.reddit_community_user_id,
      reddit_community_community_id: body.reddit_community_community_id,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    reddit_community_post_id: created.reddit_community_post_id,
    reddit_community_user_id: created.reddit_community_user_id,
    reddit_community_community_id: created.reddit_community_community_id,
    vote_type: created.vote_type,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
