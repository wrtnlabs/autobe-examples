import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const {
    name,
    display_title,
    description,
    visibility,
    status,
    created_at_from,
    created_at_to,
    sort_by,
    sort_direction,
    page = 1,
    limit = 100,
  } = props.body ?? {};

  const safeLimit = Math.min(Math.max(Number(limit ?? 100), 1), 100);
  const safePage = Math.max(Number(page ?? 1), 1);
  const skip = (safePage - 1) * safeLimit;

  const allowedSortBy = ["name", "display_title", "created_at", "status"];
  const orderByField: "name" | "display_title" | "created_at" | "status" =
    allowedSortBy.includes(sort_by as string)
      ? (sort_by as "name" | "display_title" | "created_at" | "status")
      : "created_at";
  const orderByDirection: "asc" | "desc" =
    sort_direction === "asc" || sort_direction === "desc"
      ? sort_direction
      : "desc";

  const orderBy: Record<string, "asc" | "desc"> = {};
  orderBy[orderByField] = orderByDirection;

  const where: any = {
    ...(name && {
      name: { contains: name, mode: Prisma.QueryMode.insensitive },
    }),
    ...(display_title && {
      display_title: {
        contains: display_title,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
    ...(description && {
      description: {
        contains: description,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
    ...(visibility && { visibility }),
    ...(status && { status }),
    ...((created_at_from || created_at_to) && {
      created_at: {
        ...(created_at_from && {
          gte:
            typeof created_at_from === "object"
              ? toISOStringSafe(created_at_from)
              : created_at_from,
        }),
        ...(created_at_to && {
          lte:
            typeof created_at_to === "object"
              ? toISOStringSafe(created_at_to)
              : created_at_to,
        }),
      },
    }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where,
      orderBy,
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.community_platform_communities.count({ where }),
  ]);

  const data = records.map((c) => {
    return {
      id: c.id,
      name: c.name,
      display_title: c.display_title,
      description: c.description,
      visibility: c.visibility,
      image_url:
        c.image_url === null || typeof c.image_url === "undefined"
          ? undefined
          : c.image_url,
      status: c.status,
    };
  });

  return {
    data,
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
