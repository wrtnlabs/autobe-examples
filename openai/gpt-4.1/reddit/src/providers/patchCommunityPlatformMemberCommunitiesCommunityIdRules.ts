import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdRules(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IRequest;
}): Promise<IPageICommunityPlatformCommunityRule> {
  // 1. Check if community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Extract filters
  const {
    version,
    search,
    published_at_from,
    published_at_to,
    sort_by,
    order,
    page,
    limit,
  } = props.body;
  const resolvedPage = page ?? 1;
  const resolvedLimit = limit ?? 20;
  const skip = (resolvedPage - 1) * resolvedLimit;

  // 3. Build where clause
  const whereClause: Record<string, any> = {
    community_id: props.communityId,
    ...(version !== undefined && { version }),
    ...((published_at_from || published_at_to) && {
      published_at: {
        ...(published_at_from && { gte: published_at_from }),
        ...(published_at_to && { lte: published_at_to }),
      },
    }),
    ...(search && { body: { contains: search } }),
  };

  // 4. Build orderBy
  let orderBy;
  if (sort_by) {
    orderBy = {
      [sort_by]:
        order === "asc"
          ? ("asc" as Prisma.SortOrder)
          : ("desc" as Prisma.SortOrder),
    };
  } else {
    orderBy = { published_at: "desc" as Prisma.SortOrder };
  }

  // 5. Query data
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_rules.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: resolvedLimit,
    }),
    MyGlobal.prisma.community_platform_community_rules.count({
      where: whereClause,
    }),
  ]);

  // 6. Format data
  const rules = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    body: row.body,
    version: row.version,
    published_at: toISOStringSafe(row.published_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));
  return {
    pagination: {
      current: Number(resolvedPage),
      limit: Number(resolvedLimit),
      records: total,
      pages: Math.ceil(total / resolvedLimit),
    },
    data: rules,
  };
}
