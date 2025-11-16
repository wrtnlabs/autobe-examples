import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTopPostRanking";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function getCommunityPlatformTopPostRankingsPostIdInterval(props: {
  postId: string & tags.Format<"uuid">;
  interval: string;
}): Promise<ICommunityPlatformTopPostRanking> {
  const ranking =
    await MyGlobal.prisma.mv_community_platform_top_post_rankings.findUnique({
      where: {
        post_id_interval: { post_id: props.postId, interval: props.interval },
      },
      include: {
        post: {
          select: {
            id: true,
            community_id: true,
            user_id: true,
            community: {
              select: {
                id: true,
                name: true,
                display_title: true,
                description: true,
                visibility: true,
                image_url: true,
                status: true,
              },
            },
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

  if (!ranking) {
    throw new HttpException(
      "No ranking found for specified post and interval",
      404,
    );
  }
  return {
    id: ranking.id,
    post: {
      id: ranking.post.id,
      community_id: ranking.post.community_id,
      community: ranking.post.community
        ? {
            id: ranking.post.community.id,
            name: ranking.post.community.name,
            display_title: ranking.post.community.display_title,
            description: ranking.post.community.description,
            visibility: ranking.post.community.visibility,
            image_url: ranking.post.community.image_url ?? undefined,
            status: ranking.post.community.status,
          }
        : undefined,
      user_id: ranking.post.user_id,
      user: ranking.post.user
        ? {
            id: ranking.post.user.id,
          }
        : undefined,
    },
    post_id: ranking.post_id,
    rank: ranking.rank,
    score: ranking.score,
    interval: ranking.interval,
    algorithm_version: ranking.algorithm_version,
    computed_at: toISOStringSafe(ranking.computed_at),
  };
}
