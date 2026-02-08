import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteCollector } from "../collectors/CommunityPlatformPostVoteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostsPostIdVote(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote.ISummary> {
  const { user, postId, body } = props;
  const vote_type = (
    body as {
      vote_type: "upvote" | "downvote";
    }
  ).vote_type;
  if (vote_type !== "upvote" && vote_type !== "downvote") {
    throw new HttpException("Invalid vote_type", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: { id: true, community_id: true, author_user_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_id: post.community_id,
        user_id: user.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException("User is not subscribed to the community", 403);
  }
  const bannedUser =
    await MyGlobal.prisma.community_platform_community_banned_users.findFirst({
      where: {
        community_id: post.community_id,
        user_id: user.id,
        deleted_at: null,
      },
    });
  if (bannedUser) {
    throw new HttpException("User is banned from the community", 403);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const voteSummary = await MyGlobal.prisma.$transaction(async (tx) => {
    let postVote = await tx.community_platform_post_votes.findFirst({
      where: { post_id: postId },
    });
    if (!postVote) {
      const createData = await CommunityPlatformPostVoteCollector.collect({
        body: { postId, vote_type },
      });
      postVote = await tx.community_platform_post_votes.create({
        data: {
          ...createData,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    const userVote = await tx.community_platform_post_vote_of_users.findUnique({
      where: {
        post_vote_id_user_id: {
          post_vote_id: postVote.id,
          user_id: user.id,
        },
      },
    });
    let karmaDelta = 0;
    if (userVote) {
      if (userVote.vote_type !== vote_type) {
        karmaDelta = (vote_type === "upvote" ? 1 : -1) * 2;
        await tx.community_platform_post_vote_of_users.update({
          where: { id: userVote.id },
          data: { vote_type, updated_at: now },
        });
      }
    } else {
      karmaDelta = vote_type === "upvote" ? 1 : -1;
      await tx.community_platform_post_vote_of_users.create({
        data: {
          id: v4(),
          vote_type,
          postVote: { connect: { id: postVote.id } },
          user: { connect: { id: user.id } },
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    if (karmaDelta !== 0) {
      await tx.community_platform_users.update({
        where: { id: user.id },
        data: { karma: { increment: karmaDelta } },
      });
      if (post.author_user_id) {
        await tx.community_platform_users.update({
          where: { id: post.author_user_id },
          data: { karma: { increment: karmaDelta } },
        });
      }
    }
    const upvotes = await tx.community_platform_post_vote_of_users.count({
      where: { post_vote_id: postVote.id, vote_type: "upvote" },
    });
    const downvotes = await tx.community_platform_post_vote_of_users.count({
      where: { post_vote_id: postVote.id, vote_type: "downvote" },
    });
    const net_score = upvotes - downvotes;
    return { upvotes, downvotes, net_score };
  });
  return voteSummary;
}
