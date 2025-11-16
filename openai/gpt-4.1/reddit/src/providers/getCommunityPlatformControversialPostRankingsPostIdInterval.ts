import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformControversialPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialPostRanking";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function getCommunityPlatformControversialPostRankingsPostIdInterval(props: {
  postId: string & tags.Format<"uuid">;
  interval: string;
}): Promise<ICommunityPlatformControversialPostRanking> {
  const record =
    await MyGlobal.prisma.mv_community_platform_controversial_post_rankings.findUnique(
      {
        where: {
          post_id_interval: {
            post_id: props.postId,
            interval: props.interval,
          },
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
      },
    );
  if (!record) {
    throw new HttpException("Controversial post ranking not found", 404);
  }
  return {
    id: record.id,
    post: {
      id: record.post.id,
      community_id: record.post.community_id,
      community: record.post.community
        ? {
            id: record.post.community.id,
            name: record.post.community.name,
            display_title: record.post.community.display_title,
            description: record.post.community.description,
            visibility: record.post.community.visibility,
            image_url:
              record.post.community.image_url === null
                ? undefined
                : record.post.community.image_url,
            status: record.post.community.status,
          }
        : undefined,
      user_id: record.post.user_id,
      user: record.post.user
        ? {
            id: record.post.user.id,
          }
        : undefined,
    },
    post_id: record.post_id,
    rank: record.rank,
    controversy_score: record.controversy_score,
    interval: record.interval,
    algorithm_version: record.algorithm_version,
    computed_at: toISOStringSafe(record.computed_at),
  };
}
