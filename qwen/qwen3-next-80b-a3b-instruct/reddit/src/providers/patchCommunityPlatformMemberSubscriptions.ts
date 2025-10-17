import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscription.IRequest;
}): Promise<IPageICommunityPlatformSubscription> {
  const { member, body } = props;

  // Extract pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const skip = (page - 1) * limit;

  // Build dynamic where clause for Prisma query
  // Schema indicates subscription has member_id and community_id as required fields
  // Filtering by member_id only - cannot use deleted_at or active since they don't exist in schema
  const where: Prisma.community_platform_subscriptionsWhereInput = {
    community_platform_member_id: member.id,
  };

  // Apply search filter on community name or description if provided
  // Schema shows community has name and description fields
  if (body.search) {
    where.OR = [
      { community: { name: { contains: body.search } } },
      { community: { description: { contains: body.search } } },
    ];
  }

  // Build orderBy object - fix error with string literal types
  // Prisma expects "asc" | "desc" for sort order
  const orderBy =
    body.sortBy === "community_name"
      ? {
          community: {
            name: body.sortOrder === "asc" ? "asc" : "desc",
          },
        }
      : { created_at: body.sortOrder === "asc" ? "asc" : "desc" };

  // Execute queries with inline parameters - no intermediate variables allowed
  const [subscriptions, totalCount] = await Promise.all([
    MyGlobal.prisma.community_platform_subscriptions.findMany({
      where,
      orderBy: (function () {
        if (!body.sortBy) return { created_at: "desc" };
        if (body.sortBy === "community_name") {
          return {
            community: { name: body.sortOrder === "asc" ? "asc" : "desc" },
          };
        } else {
          return { created_at: body.sortOrder === "asc" ? "asc" : "desc" };
        }
      })(),
      skip,
      take: limit,
      include: { community: true },
    }),
    MyGlobal.prisma.community_platform_subscriptions.count({ where }),
  ]);

  // Map results to exact ICommunityPlatformSubscription type using satisfies
  // Handle null values and convert to undefined as per interface
  const data = subscriptions.map((sub) => ({
    id: sub.id,
    member_id: sub.community_platform_member_id,
    community_id: sub.community_platform_communities_id,
    created_at: toISOStringSafe(sub.created_at),
    updated_at: toISOStringSafe(sub.updated_at),
    deleted_at: sub.deleted_at ? toISOStringSafe(sub.deleted_at) : undefined,
    active: sub.active,
  })) satisfies ICommunityPlatformSubscription[];

  // Return with properly typed pagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
