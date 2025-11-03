import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const { body } = props;

  // Calculate pagination variables
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Build the where filter
  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  // Validate and set sort field and order
  const allowedSortFields = ["name", "created_at"];
  const sortBy = allowedSortFields.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Query the database
  const [communities, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where,
      select: {
        id: true,
        name: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_communities.count({ where }),
  ]);

  // Return paginated result
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: communities.map(({ id, name }) => ({ id, name })),
  };
}
