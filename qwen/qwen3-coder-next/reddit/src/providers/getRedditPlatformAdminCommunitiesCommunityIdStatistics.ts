import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdStatistics(props: {
  admin: AdminPayload;
  communityId: string;
}): Promise<IRedditPlatformCommunity> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
      include: {
        postViewStats: true,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const postCount = community.postViewStats.length;
  const totalVoteScore = community.postViewStats.reduce(
    (sum, stat) => sum + stat.vote_score,
    0,
  );
  const averageVoteScore = postCount > 0 ? totalVoteScore / postCount : 0;
  const totalComments = community.postViewStats.reduce(
    (sum, stat) => sum + stat.comment_count,
    0,
  );
  const averageCommentsPerPost = postCount > 0 ? totalComments / postCount : 0;
  return {
    id: community.id,
    owner_id: community.owner_id,
    name: community.name,
    description: community.description ?? undefined,
    icon_url: community.icon_url ?? undefined,
    subscriber_count: community.subscriber_count,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
  };
}
