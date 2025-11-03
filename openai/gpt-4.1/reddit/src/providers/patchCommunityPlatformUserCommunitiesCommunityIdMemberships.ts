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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommunitiesCommunityIdMemberships(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IRequest;
}): Promise<IPageICommunityPlatformCommunityMembership.ISummary> {
  const { communityId, body } = props;

  // Validate community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId, deleted_at: null },
      select: { id: true, name: true, description: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const page = body.page;
  const limit = body.limit;
  const offset = (page - 1) * limit;

  // Build search filter for user.display_name or user.email
  const userSearch = body.search;
  const userWhere =
    userSearch !== undefined
      ? {
          OR: [
            { display_name: { contains: userSearch } },
            { email: { contains: userSearch } },
          ],
        }
      : undefined;

  // Filter by join date
  const joinedAtFilter =
    body.joined_after !== undefined || body.joined_before !== undefined
      ? {
          joined_at: {
            ...(body.joined_after !== undefined && { gte: body.joined_after }),
            ...(body.joined_before !== undefined && {
              lte: body.joined_before,
            }),
          },
        }
      : {};

  // Sort
  let orderBy: Record<string, unknown>;
  if (body.sort_by === "alphabetical") {
    orderBy = {
      user: { display_name: body.sort_order === "desc" ? "desc" : "asc" },
    };
  } else {
    orderBy = { joined_at: body.sort_order === "desc" ? "desc" : "asc" };
  }

  const where = {
    community_platform_community_id: communityId,
    ...joinedAtFilter,
    ...(userWhere !== undefined && { user: userWhere }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_memberships.findMany({
      where,
      include: {
        user: { select: { id: true, display_name: true } },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_memberships.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      user: {
        id: row.user.id,
        display_name: row.user.display_name,
      },
      community: {
        id: community.id,
        name: community.name,
        description: community.description,
      },
      joined_at: toISOStringSafe(row.joined_at),
    })),
  };
}
