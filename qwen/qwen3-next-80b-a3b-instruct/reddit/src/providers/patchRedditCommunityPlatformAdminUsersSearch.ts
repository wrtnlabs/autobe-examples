import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminUsersSearch(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityGuest.IRequest;
}): Promise<IPageIRedditCommunityGuest.ISum> {
  const { search, page = 1, limit = 20 } = props.body;
  // Validate search term
  if (!search || search.trim().length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const searchQuery = search.trim().toLowerCase();
  const skip = (page - 1) * limit;
  // Build filter: active users matching search term in username, display_name, or email
  const whereClause = {
    is_deleted: false,
    OR: [
      { username: { contains: searchQuery, mode: "insensitive" as const } },
      { display_name: { contains: searchQuery, mode: "insensitive" as const } },
      { email: { contains: searchQuery, mode: "insensitive" as const } },
    ],
  };
  // Fetch total matching records for pagination
  const total = await MyGlobal.prisma.reddit_community_members.count({
    where: whereClause,
  });
  // Fetch data with sort priority: display_name match (highest weight), then username, then email, then karma, then created_at
  const data = await MyGlobal.prisma.reddit_community_members.findMany({
    where: whereClause,
    orderBy: [
      { display_name: "asc" },
      { username: "asc" },
      { email: "asc" },
      { karma_score: "desc" },
      { created_at: "asc" },
    ],
    skip,
    take: limit,
    select: {
      username: true,
      display_name: true,
      karma_score: true,
    },
  });
  return {
    data: data.map(
      (item) =>
        ({
          username: item.username,
          display_name: item.display_name,
          karma_score: item.karma_score,
        }) satisfies IRedditCommunityGuest.ISum,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
