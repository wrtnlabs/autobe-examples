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
  // Resolve member_id filter: always restrict to authenticated user
  const memberId = member.id;

  // Pagination params
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;

  // status handling
  let deletedAtFilter: Record<string, unknown> | undefined = undefined;
  if (body.status === "active") deletedAtFilter = { deleted_at: null };
  else if (body.status === "deleted")
    deletedAtFilter = { deleted_at: { not: null } };

  // created/deleted date range
  const createdAtFilter: Record<string, unknown> = {};
  if (body.created_at_min !== undefined)
    createdAtFilter.gte = body.created_at_min;
  if (body.created_at_max !== undefined)
    createdAtFilter.lte = body.created_at_max;
  const deletedAtRange: Record<string, unknown> = {};
  if (body.deleted_at_min !== undefined)
    deletedAtRange.gte = body.deleted_at_min;
  if (body.deleted_at_max !== undefined)
    deletedAtRange.lte = body.deleted_at_max;

  // Build base where clause
  const baseWhere = {
    member_id: memberId,
    ...(body.community_id !== undefined && { community_id: body.community_id }),
    ...deletedAtFilter,
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(Object.keys(deletedAtRange).length > 0 && {
      deleted_at: deletedAtRange,
    }),
  };

  // Join communities if search or sort_by = community_name
  let where = baseWhere;
  let includeCommunities = false;
  if (
    (body.search !== undefined && body.search.trim().length > 0) ||
    body.sort_by === "community_name"
  ) {
    includeCommunities = true;
  }

  // Search and sort
  let subs: any[] = [];
  let total = 0;
  if (!includeCommunities) {
    [subs, total] = await Promise.all([
      MyGlobal.prisma.community_platform_subscriptions.findMany({
        where,
        orderBy: [
          body.sort_by === "created_at" || !body.sort_by
            ? { created_at: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "deleted_at"
              ? { deleted_at: body.sort_order === "asc" ? "asc" : "desc" }
              : { created_at: "desc" },
        ],
        skip,
        take: limit,
      }),
      MyGlobal.prisma.community_platform_subscriptions.count({ where }),
    ]);
  } else {
    // Join with communities for search/sort
    const all = await MyGlobal.prisma.community_platform_subscriptions.findMany(
      {
        where,
        include: { community: true },
      },
    );
    let filtered = all as ((typeof all)[0] & { community: { name: string } })[];
    if (body.search && body.search.trim().length > 0) {
      const searchLower = body.search.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.community &&
          row.community.name.toLowerCase().includes(searchLower),
      );
    }
    if (body.sort_by === "community_name") {
      filtered = filtered.sort((a, b) => {
        if (!a.community || !b.community) return 0;
        return (
          a.community.name.localeCompare(b.community.name) *
          (body.sort_order === "desc" ? -1 : 1)
        );
      });
    } else if (body.sort_by === "deleted_at") {
      filtered = filtered.sort((a, b) => {
        const da = a.deleted_at ? toISOStringSafe(a.deleted_at) : "";
        const db = b.deleted_at ? toISOStringSafe(b.deleted_at) : "";
        if (da === db) return 0;
        return (da < db ? -1 : 1) * (body.sort_order === "desc" ? -1 : 1);
      });
    } else {
      // default or created_at
      filtered = filtered.sort((a, b) => {
        const ca = toISOStringSafe(a.created_at);
        const cb = toISOStringSafe(b.created_at);
        if (ca === cb) return 0;
        return (ca < cb ? -1 : 1) * (body.sort_order === "asc" ? 1 : -1);
      });
    }
    total = filtered.length;
    subs = filtered.slice(skip, skip + limit);
  }
  // Map to DTOs
  const data = subs.map((row) => ({
    id: row.id,
    member_id: row.member_id,
    community_id: row.community_id,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
