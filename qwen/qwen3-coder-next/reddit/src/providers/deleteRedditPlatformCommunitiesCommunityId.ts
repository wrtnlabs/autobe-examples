import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformCommunitiesCommunityId(props: {
  communityId: string;
}): Promise<IRedditPlatformCommunity> {
  // Delete reports for posts in this community
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: { community_id: props.communityId },
  });
  const postIds = posts.map((p) => p.id);
  if (postIds.length > 0) {
    await MyGlobal.prisma.reddit_platform_reports.deleteMany({
      where: {
        target_id: { in: postIds },
      },
    });
  }
  return {};
}
