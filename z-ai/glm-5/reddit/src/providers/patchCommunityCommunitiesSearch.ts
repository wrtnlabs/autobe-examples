import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommunityAtSummaryTransformer } from "../transformers/CommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityCommunitiesSearch(props: {
  body: ICommunityCommunity.IRequest;
}): Promise<IPageICommunityCommunity.ISummary> {
  const query = props.body.query;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const sort = props.body.sort ?? "subscriber_count";
  // Validate minimum query length
  if (query !== undefined && query.length < 2) {
    throw new HttpException(
      "Please enter at least 2 characters to search.",
      400,
    );
  }
  const skip = (page - 1) * limit;
  if (query) {
    // Search mode: relevance ranking with in-memory sorting
    const whereInput = {
      deleted_at: null,
      name: { contains: query, mode: "insensitive" as const },
    } satisfies Prisma.community_communitiesWhereInput;
    const communities = await MyGlobal.prisma.community_communities.findMany({
      where: whereInput,
      ...CommunityCommunityAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.community_communities.count({
      where: whereInput,
    });
    // Compute relevance and sort
    const queryLower = query.toLowerCase();
    const sorted = communities
      .map((c) => ({
        record: c,
        relevance:
          c.name.toLowerCase() === queryLower
            ? 3
            : c.name.toLowerCase().startsWith(queryLower)
              ? 2
              : 1,
      }))
      .sort((a, b) => {
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;
        return b.record.subscriber_count - a.record.subscriber_count;
      });
    const paginated = sorted.slice(skip, skip + limit);
    const data = await ArrayUtil.asyncMap(
      paginated.map((p) => p.record),
      CommunityCommunityAtSummaryTransformer.transform,
    );
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    } satisfies IPageICommunityCommunity.ISummary;
  } else {
    // Browse mode: database-level sorting
    const whereInput = {
      deleted_at: null,
    } satisfies Prisma.community_communitiesWhereInput;
    const orderByInput = (
      sort === "created_at"
        ? { created_at: "desc" as const }
        : { subscriber_count: "desc" as const }
    ) satisfies Prisma.community_communitiesOrderByWithRelationInput;
    const communities = await MyGlobal.prisma.community_communities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityCommunityAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.community_communities.count({
      where: whereInput,
    });
    const data = await ArrayUtil.asyncMap(
      communities,
      CommunityCommunityAtSummaryTransformer.transform,
    );
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    } satisfies IPageICommunityCommunity.ISummary;
  }
}
