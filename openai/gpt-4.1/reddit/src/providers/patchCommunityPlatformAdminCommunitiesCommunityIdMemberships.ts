import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdMemberships(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IRequest;
}): Promise<IPageICommunityPlatformCommunityMembership.ISummary> {
  const { communityId, body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build joined_at filter
  let joinedAtFilter: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.joined_after !== undefined) {
    joinedAtFilter.gte = body.joined_after;
  }
  if (body.joined_before !== undefined) {
    joinedAtFilter.lte = body.joined_before;
  }

  // Build main where clause
  const where: Record<string, unknown> = {
    community_platform_community_id: communityId,
    user: { deleted_at: null },
    ...(Object.keys(joinedAtFilter).length > 0
      ? { joined_at: joinedAtFilter }
      : {}),
  };
  if (body.search !== undefined && body.search !== "") {
    where.OR = [
      { user: { display_name: { contains: body.search } } },
      { user: { email: { contains: body.search } } },
    ];
  }

  // Determine sorting
  let orderBy: Record<string, any>;
  if (body.sort_by === "alphabetical") {
    orderBy = {
      user: { display_name: body.sort_order === "desc" ? "desc" : "asc" },
    };
  } else {
    orderBy = { joined_at: body.sort_order === "asc" ? "asc" : "desc" };
  }

  // Query memberships with user and community, and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_memberships.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_platform_community_memberships.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    user: {
      id: row.user.id,
      display_name: row.user.display_name,
    },
    community: {
      id: row.community.id,
      name: row.community.name,
      description: row.community.description,
    },
    joined_at: toISOStringSafe(row.joined_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
