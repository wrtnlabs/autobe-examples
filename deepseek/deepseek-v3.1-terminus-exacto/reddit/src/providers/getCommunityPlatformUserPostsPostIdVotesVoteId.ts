import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformUserPostsPostIdVotesVoteId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  // Verify the post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        post_id: props.postId,
      },
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
          },
        } satisfies Prisma.community_platform_usersFindManyArgs,
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            user: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
                karma: true,
                created_at: true,
              },
            } satisfies Prisma.community_platform_usersFindManyArgs,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon_url: true,
                created_at: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    avatar_url: true,
                    karma: true,
                    created_at: true,
                  },
                } satisfies Prisma.community_platform_usersFindManyArgs,
              },
            } satisfies Prisma.community_platform_communitiesFindManyArgs,
          },
        } satisfies Prisma.community_platform_postsFindManyArgs,
      },
    });
  return {
    id: vote.id,
    vote_type: vote.vote_type,
    created_at: vote.created_at.toISOString(),
    updated_at: vote.updated_at.toISOString(),
    user: {
      id: vote.user.id,
      username: vote.user.username,
      display_name: vote.user.display_name,
      avatar_url: vote.user.avatar_url,
      karma: vote.user.karma,
      created_at: vote.user.created_at.toISOString(),
    },
    post: {
      id: vote.post.id,
      title: vote.post.title,
      post_type: vote.post.post_type,
      created_at: vote.post.created_at.toISOString(),
      author: {
        id: vote.post.user.id,
        username: vote.post.user.username,
        display_name: vote.post.user.display_name,
        avatar_url: vote.post.user.avatar_url,
        karma: vote.post.user.karma,
        created_at: vote.post.user.created_at.toISOString(),
      } satisfies ICommunityPlatformUser.ISummary,
      community: {
        id: vote.post.community.id,
        name: vote.post.community.name,
        description: vote.post.community.description,
        icon_url: vote.post.community.icon_url,
        created_at: vote.post.community.created_at.toISOString(),
        owner: {
          id: vote.post.community.owner.id,
          username: vote.post.community.owner.username,
          display_name: vote.post.community.owner.display_name,
          avatar_url: vote.post.community.owner.avatar_url,
          karma: vote.post.community.owner.karma,
          created_at: vote.post.community.owner.created_at.toISOString(),
        } satisfies ICommunityPlatformUser.ISummary,
      } satisfies ICommunityPlatformCommunity.ISummary,
    } satisfies ICommunityPlatformPost.ISummary,
  };
}
