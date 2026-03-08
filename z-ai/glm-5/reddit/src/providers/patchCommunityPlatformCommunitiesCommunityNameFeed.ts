import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityNameFeed(props: {
  communityName: string;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: {
          equals: props.communityName,
          mode: "insensitive",
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const now = new Date();
  const timeBoundaries: Record<string, Date> = {
    today: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    this_week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    this_month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    this_year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    all_time: new Date(0),
  };
  const whereInput = {
    community_id: community.id,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          text_content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.contentType && { content_type: props.body.contentType }),
    ...(sort === "top" && {
      created_at: { gte: timeBoundaries[props.body.timeFilter ?? "all_time"] },
    }),
  } satisfies Prisma.community_platform_postsWhereInput;
  const orderByInput:
    | Prisma.community_platform_postsOrderByWithRelationInput
    | Prisma.community_platform_postsOrderByWithRelationInput[] =
    sort === "new"
      ? { created_at: "desc" }
      : sort === "top"
        ? { score: "desc" }
        : sort === "controversial"
          ? [{ comment_count: "desc" }, { score: "asc" }]
          : { score: "desc" };
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      posts,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    } satisfies IPage.IPagination,
  };
}
