import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunities(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  // Clamp pagination values
  const validatedPage = page < 1 ? 1 : page;
  const validatedLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  // Validate and normalize sort field
  const validatedSort: "name" | "subscriber_count" | "created_at" = [
    "name",
    "subscriber_count",
    "created_at",
  ].includes(sort)
    ? sort
    : "created_at";
  // Validate and normalize order value
  const validatedOrder: "asc" | "desc" = ["asc", "desc"].includes(order)
    ? order
    : "desc";
  // Build WHERE clause
  const whereInput: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.name !== undefined &&
      props.body.name !== "" && {
        name: {
          contains: props.body.name,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.minSubscribers !== undefined && {
      subscriber_count: {
        gte: props.body.minSubscribers,
      },
    }),
    ...(props.body.maxSubscribers !== undefined && {
      subscriber_count: {
        lte: props.body.maxSubscribers,
      },
    }),
  } satisfies Prisma.reddit_platform_communitiesWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_platform_communitiesOrderByWithRelationInput[] =
    [
      {
        [validatedSort]: validatedOrder,
      },
    ] satisfies Prisma.reddit_platform_communitiesOrderByWithRelationInput[];
  // Calculate pagination
  const skip = (validatedPage - 1) * validatedLimit;
  // Query communities with pagination
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: orderByInput,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformCommunityAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / validatedLimit);
  return {
    data: transformedData,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformCommunity.ISummary;
}
