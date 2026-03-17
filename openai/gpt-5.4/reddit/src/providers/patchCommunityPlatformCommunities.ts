import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  if (page < 1) throw new HttpException("Invalid page", 400);
  if (limit < 1 || limit > 100) throw new HttpException("Invalid limit", 400);
  if (props.body.status !== undefined && props.body.status !== "active")
    throw new HttpException("Unsupported status filter", 400);
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.trim() !== ""
      ? props.body.search
      : undefined;
  const where = {
    deleted_at: null,
    status: "active",
    ...(search !== undefined
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {}),
    ...(props.body.slug !== undefined
      ? {
          slug: {
            contains: props.body.slug,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(props.body.title !== undefined
      ? {
          title: {
            contains: props.body.title,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(props.body.description !== undefined
      ? {
          description: {
            contains: props.body.description,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  const orderBy:
    | Prisma.community_platform_communitiesOrderByWithRelationInput[]
    | null =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? [{ created_at: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.asc }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
        : props.body.sort === "updated_at_desc"
          ? [
              { updated_at: Prisma.SortOrder.desc },
              { id: Prisma.SortOrder.asc },
            ]
          : props.body.sort === "updated_at_asc"
            ? [
                { updated_at: Prisma.SortOrder.asc },
                { id: Prisma.SortOrder.asc },
              ]
            : props.body.sort === "title_asc"
              ? [{ title: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
              : props.body.sort === "title_desc"
                ? [
                    { title: Prisma.SortOrder.desc },
                    { id: Prisma.SortOrder.asc },
                  ]
                : props.body.sort === "slug_asc"
                  ? [
                      { slug: Prisma.SortOrder.asc },
                      { id: Prisma.SortOrder.asc },
                    ]
                  : props.body.sort === "slug_desc"
                    ? [
                        { slug: Prisma.SortOrder.desc },
                        { id: Prisma.SortOrder.asc },
                      ]
                    : null;
  if (orderBy === null) throw new HttpException("Unsupported sort field", 400);
  const select = {
    id: true,
    slug: true,
    title: true,
    description: true,
    status: true,
    member: CommunityPlatformMemberAtSummaryTransformer.select(),
    subscriptions: {
      where: {
        active: true,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
    created_at: true,
    updated_at: true,
    deleted_at: true,
  } satisfies Prisma.community_platform_communitiesSelect;
  const args = {
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    select,
  } satisfies Prisma.community_platform_communitiesFindManyArgs;
  const data: Prisma.community_platform_communitiesGetPayload<{
    select: typeof select;
  }>[] = await MyGlobal.prisma.community_platform_communities.findMany(args);
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (community) =>
      CommunityPlatformCommunityAtSummaryTransformer.transform(community),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
