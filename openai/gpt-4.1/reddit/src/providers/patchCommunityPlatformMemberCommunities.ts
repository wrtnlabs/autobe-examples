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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const body = props.body;
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Where clause (immutable)
  const where = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        OR: [
          { name: { contains: body.search } },
          { title: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  // Inline order selection by sort param
  let orderBy: { created_at: "desc" | "asc" } = { created_at: "desc" };
  if (body.sort === "new") {
    orderBy = { created_at: "desc" };
  } else if (body.sort === "top") {
    orderBy = { created_at: "desc" };
  } else if (body.sort === "controversial") {
    orderBy = { created_at: "desc" };
  } else if (body.sort === "hot") {
    orderBy = { created_at: "desc" };
  }
  if (body.order === "asc" || body.order === "desc") {
    orderBy = { created_at: body.order };
  }

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        title: true,
        slug: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_communities.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    slug: row.slug,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
