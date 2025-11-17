import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconomicBoardPosts(props: {
  body: IEconomicBoardPost.IRequest;
}): Promise<IPageIEconomicBoardPost.ISummary> {
  // Since IEconomicBoardPost.IRequest is defined as string, we treat the body as a string
  const searchQuery = props.body;

  // Extract pagination parameters from defaults or other sources
  const page = 1;
  const limit = 100;
  const sort_by = "created_at";
  const sort_order = "desc";

  // Validate sort parameters
  const validSortFields = ["created_at", "updated_at", "title"] as const;
  const validSortOrders = ["asc", "desc"] as const;

  if (!validSortFields.includes(sort_by)) {
    throw new HttpException("Invalid sort field", 400);
  }

  if (!validSortOrders.includes(sort_order)) {
    throw new HttpException("Invalid sort order", 400);
  }

  // Convert page and limit to numbers
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build WHERE clause for prisma
  const where: Record<string, any> = {
    deleted_at: null, // Only non-deleted posts
  };

  // Parse status filtering from search query string
  if (searchQuery.includes("pending")) {
    where.status = "pending";
  } else if (searchQuery.includes("published")) {
    where.status = "published";
  } else if (searchQuery.includes("rejected")) {
    where.status = "rejected";
  }

  // Parse category_id filtering from search query
  const categoryMatch = searchQuery.match(/category_id:(\w+)/);
  if (categoryMatch && categoryMatch[1]) {
    where.category_id = categoryMatch[1];
  }

  // Parse citizen_id filtering from search query
  const citizenMatch = searchQuery.match(/citizen_id:(\w+)/);
  if (citizenMatch && citizenMatch[1]) {
    where.citizen_id = citizenMatch[1];
  }

  // Parse date range filtering from search query
  const fromMatch = searchQuery.match(
    /created_at_from:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/,
  );
  const toMatch = searchQuery.match(
    /created_at_to:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/,
  );

  if (fromMatch && fromMatch[1]) {
    if (!where.created_at) where.created_at = {};
    where.created_at.gte = fromMatch[1];
  }

  if (toMatch && toMatch[1]) {
    if (!where.created_at) where.created_at = {};
    where.created_at.lte = toMatch[1];
  }

  // Parse title and body search from search query
  const titleMatch = searchQuery.match(/title:(.+?)(?=\s|$)/);
  const bodyMatch = searchQuery.match(/body:(.+?)(?=\s|$)/);

  if (titleMatch || bodyMatch) {
    const searchConditions = [];

    if (titleMatch && titleMatch[1]) {
      searchConditions.push({
        title: {
          contains: titleMatch[1].trim(),
          mode: "insensitive",
        },
      });
    }

    if (bodyMatch && bodyMatch[1]) {
      searchConditions.push({
        body: {
          contains: bodyMatch[1].trim(),
          mode: "insensitive",
        },
      });
    }

    if (searchConditions.length > 1) {
      where.AND = searchConditions;
    } else if (searchConditions.length === 1) {
      Object.assign(where, searchConditions[0]);
    }
  }

  // Build sorting
  const orderBy: Record<string, any> = {};
  orderBy[sort_by] = sort_order;

  // Fetch data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_board_posts.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.economic_board_posts.count({ where }),
  ]);

  // Transform to ISummary format - return as string array as per DTO
  const summaryData = data.map((post) => post.id);

  // Return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
