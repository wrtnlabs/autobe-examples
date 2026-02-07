import { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostFeed";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityCommunityFeedsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPostFeed.ISummary> {
  const communityId = props.id;
  const sortAlgorithm = "hot";
  const limit = 20;
  const page = 1;
  const skip = (page - 1) * limit;
  const feedEntries =
    await MyGlobal.prisma.community_mv_community_feeds.findMany({
      where: { community_id: communityId, sort_algorithm: sortAlgorithm },
      skip,
      take: limit,
      orderBy: { sort_order: "asc" },
      select: { post_id: true, sort_order: true },
    });
  const total = await MyGlobal.prisma.community_mv_community_feeds.count({
    where: { community_id: communityId, sort_algorithm: sortAlgorithm },
  });
  return {
    data: [],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
