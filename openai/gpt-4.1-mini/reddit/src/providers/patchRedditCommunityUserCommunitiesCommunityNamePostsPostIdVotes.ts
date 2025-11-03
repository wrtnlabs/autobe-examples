import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserCommunitiesCommunityNamePostsPostIdVotes(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IRequest;
}): Promise<IPageIRedditCommunityPostVote.ISummary> {
  const { user, communityName, postId, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
    });
  if (!community) throw new HttpException("Community not found", 404);

  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: { id: postId, reddit_community_community_id: community.id },
  });
  if (!post) throw new HttpException("Post not found in community", 404);

  if (body.vote_type !== "upvote" && body.vote_type !== "downvote") {
    throw new HttpException("Invalid vote_type", 400);
  }

  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_post_id: postId,
        reddit_community_user_id: user.id,
      },
    });

  const now = toISOStringSafe(new Date());

  if (existingVote) {
    if (existingVote.vote_type !== body.vote_type) {
      await MyGlobal.prisma.reddit_community_post_votes.update({
        where: { id: existingVote.id },
        data: { vote_type: body.vote_type, updated_at: now },
      });
    }
  } else {
    await MyGlobal.prisma.reddit_community_post_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_post_id: postId,
        reddit_community_user_id: user.id,
        reddit_community_community_id: community.id,
        vote_type: body.vote_type,
        created_at: now,
        updated_at: now,
      },
    });
  }

  const limit = 20;
  const page = 1;
  const skip = (page - 1) * limit;

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_votes.findMany({
      where: { reddit_community_post_id: postId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        reddit_community_post_id: true,
        reddit_community_user_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_post_votes.count({
      where: { reddit_community_post_id: postId },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: votes.map(
      ({
        id,
        reddit_community_post_id,
        reddit_community_user_id,
        vote_type,
        created_at,
        updated_at,
      }) => ({
        id,
        reddit_community_post_id,
        reddit_community_user_id,
        vote_type,
        created_at: toISOStringSafe(created_at),
        updated_at: toISOStringSafe(updated_at),
      }),
    ),
  };
}
