import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminCommunitiesSearch(props: {
  admin: AdminPayload;
  body: ICommunityCommunity.IRequest;
}): Promise<IPageICommunityCommunity.ISummary> {
  const { search, sort = "subscriber_count_desc", cursor } = props.body;
  const take = 20;
  // Parse cursor from string format: "community_id|sort_value"
  let cursorId: string | null = null;
  let cursorSortValue: number | string | null = null;
  if (cursor) {
    const parts = cursor.split("|");
    if (parts.length === 2) {
      cursorId = parts[0];
      cursorSortValue =
        sort === "subscriber_count_desc" ? Number(parts[1]) : parts[1];
    }
  }
  // Build filters for communities - removed deleted_at: null since it doesn't exist in schema
  const where: Prisma.community_communitiesWhereInput = {
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };
  // Calculate total count
  const total = await MyGlobal.prisma.community_communities.count({ where });
  // Define the base query for community data with subscriber count
  const sql = `SELECT 
      cc.id, 
      cc.name, 
      cc.description, 
      cc.icon_url, 
      cc.created_at, 
      COUNT(cs.id) AS subscriber_count
    FROM community_communities cc
    LEFT JOIN community_subscriptions cs ON cs.community_community_id = cc.id
    WHERE true
    ${search ? " AND LOWER(cc.name) ILIKE LOWER($1)" : ""}
    GROUP BY cc.id
    ORDER BY 
      COUNT(cs.id) DESC, 
      cc.name ASC
    LIMIT $2`;
  // Calculate offset for cursor-based pagination
  let queryParams: any[] = search ? [search, take + 1] : [take + 1];
  let offset = 0;
  if (cursorId) {
    // Create a query to count how many records come before the cursor
    const countQuery = `SELECT COUNT(*) FROM (
      SELECT cc2.id, COUNT(cs2.id) AS subscriber_count
      FROM community_communities cc2
      LEFT JOIN community_subscriptions cs2 ON cs2.community_community_id = cc2.id
      WHERE true
      ${search ? " AND LOWER(cc2.name) ILIKE LOWER($1)" : ""}
      GROUP BY cc2.id
      HAVING (
        COUNT(cs2.id) < $3 OR 
        (COUNT(cs2.id) = $3 AND cc2.id < $4)
      )
    ) AS count_table`;
    queryParams = search
      ? [search, take + 1, cursorSortValue, cursorId]
      : [take + 1, cursorSortValue, cursorId];
    // Execute the count query and get the offset
    const countResult = await MyGlobal.prisma.$queryRawUnsafe<
      {
        count: number;
      }[]
    >(countQuery, ...queryParams);
    offset = countResult.length > 0 ? countResult[0].count : 0;
  }
  // Finalize the SQL query with offset for pagination
  const finalSql = sql + " OFFSET $" + (search ? "3" : "2");
  const finalParams = search
    ? [...queryParams.slice(0, 2), offset]
    : [...queryParams.slice(0, 1), offset];
  // Execute the main query with offset
  const data = await MyGlobal.prisma.$queryRawUnsafe<
    {
      id: string;
      name: string;
      description: string;
      icon_url: string | null;
      created_at: Date;
      subscriber_count: number;
    }[]
  >(finalSql, ...finalParams); // Corrected: Added [] to make it an array type
  // Check if there's more data
  const hasMore = data.length > take;
  const paginatedData = hasMore ? data.slice(0, -1) : data;
  const summaryData = paginatedData.map((community) => {
    // ICommunityCommunity.ISummary is empty object, so we return empty object as per DTO
    return {} as ICommunityCommunity.ISummary;
  });
  // Generate next cursor
  let nextCursor: string | null = null;
  if (hasMore) {
    const last = paginatedData[paginatedData.length - 1];
    if (sort === "subscriber_count_desc") {
      nextCursor = `${last.id}|${last.subscriber_count}`;
    } else if (sort === "name_asc") {
      nextCursor = `${last.id}|${last.name}`;
    } else if (sort === "name_desc") {
      nextCursor = `${last.id}|${last.name}`;
    }
  }
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
  };
}
