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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    community_platform_member_id: props.member.id,
    active: true,
    deleted_at: null,
    community: {
      deleted_at: null,
      ...(props.body.search !== undefined && props.body.search.length !== 0
        ? {
            OR: [
              {
                title: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                slug: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(props.body.slug !== undefined && props.body.slug.length !== 0
        ? {
            slug: {
              contains: props.body.slug,
              mode: "insensitive",
            },
          }
        : {}),
      ...(props.body.title !== undefined && props.body.title.length !== 0
        ? {
            title: {
              contains: props.body.title,
              mode: "insensitive",
            },
          }
        : {}),
      ...(props.body.description !== undefined &&
      props.body.description.length !== 0
        ? {
            description: {
              contains: props.body.description,
              mode: "insensitive",
            },
          }
        : {}),
      ...(props.body.status !== undefined && props.body.status.length !== 0
        ? {
            status: props.body.status,
          }
        : {}),
    },
  } satisfies Prisma.community_platform_subscriptionsWhereInput;
  const orderByInput = (
    props.body.sort === "slug_asc"
      ? [
          { community: { slug: "asc" } },
          { community_platform_community_id: "asc" },
        ]
      : props.body.sort === "slug_desc"
        ? [
            { community: { slug: "desc" } },
            { community_platform_community_id: "asc" },
          ]
        : props.body.sort === "title_asc"
          ? [
              { community: { title: "asc" } },
              { community_platform_community_id: "asc" },
            ]
          : props.body.sort === "title_desc"
            ? [
                { community: { title: "desc" } },
                { community_platform_community_id: "asc" },
              ]
            : props.body.sort === "status_asc"
              ? [
                  { community: { status: "asc" } },
                  { community_platform_community_id: "asc" },
                ]
              : props.body.sort === "status_desc"
                ? [
                    { community: { status: "desc" } },
                    { community_platform_community_id: "asc" },
                  ]
                : props.body.sort === "created_at_asc"
                  ? [
                      { community: { created_at: "asc" } },
                      { community_platform_community_id: "asc" },
                    ]
                  : props.body.sort === "created_at_desc"
                    ? [
                        { community: { created_at: "desc" } },
                        { community_platform_community_id: "asc" },
                      ]
                    : props.body.sort === "updated_at_asc"
                      ? [
                          { community: { updated_at: "asc" } },
                          { community_platform_community_id: "asc" },
                        ]
                      : props.body.sort === "updated_at_desc"
                        ? [
                            { community: { updated_at: "desc" } },
                            { community_platform_community_id: "asc" },
                          ]
                        : [
                            { created_at: "desc" },
                            { community_platform_community_id: "asc" },
                          ]
  ) satisfies Prisma.community_platform_subscriptionsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.community_platform_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      distinct: ["community_platform_community_id"],
      orderBy: orderByInput,
      select: {
        community: {
          select: {
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
            } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
      },
    });
  const grouped =
    await MyGlobal.prisma.community_platform_subscriptions.groupBy({
      by: ["community_platform_community_id"],
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(records, async (record) => ({
      id: record.community.id,
      slug: record.community.slug,
      title: record.community.title,
      description: record.community.description,
      status: record.community.status,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        record.community.member,
      ),
      subscriber_count: record.community.subscriptions.length,
      created_at: record.community.created_at.toISOString(),
      updated_at: record.community.updated_at.toISOString(),
      deleted_at: record.community.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: grouped.length,
      pages: Math.ceil(grouped.length / limit),
    } satisfies IPage.IPagination,
  };
}
