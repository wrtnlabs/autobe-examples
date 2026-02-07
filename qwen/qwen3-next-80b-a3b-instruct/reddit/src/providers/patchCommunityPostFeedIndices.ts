import { ICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvPostFeedIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvPostFeedIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostFeedIndices(props: {
  body: ICommunityMvPostFeedIndex.IRequest;
}): Promise<IPageICommunityMvPostFeedIndex.ISummary> {
  const page = 1; // Default per system contract (IRequest is empty)
  const limit = 100; // Default per system contract (IRequest is empty)
  const skip = (page - 1) * limit;
  // System default: return all non-deleted feed indices (no filtering)
  const data = await MyGlobal.prisma.community_mv_post_feed_indices.findMany({
    skip,
    take: limit,
    orderBy: { sort_order: "asc" },
    select: {
      post_id: true,
      sort_order: true,
      last_updated: true,
      feed_type: true,
      sort_algorithm: true,
    },
  });
  const total = await MyGlobal.prisma.community_mv_post_feed_indices.count();
  const transformedData = data.map((item) => ({
    post_id: item.post_id as string & tags.Format<"uuid">,
    sort_order: item.sort_order,
    last_updated: toISOStringSafe(item.last_updated),
    feed_type: item.feed_type,
    sort_algorithm: item.sort_algorithm,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
