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
}): Promise<IPageIEconomicBoardPost> {
  // Validate and normalize request parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const search = props.body.search;
  const topic = props.body.topic;
  const sortBy = props.body.sortBy ?? "created_at";
  const order = props.body.order ?? "desc";
  const status = props.body.status ?? "published";
  const createdAfter = props.body.createdAfter;
  const createdBefore = props.body.createdBefore;

  // Build the where clause for Prisma query - only include defined fields
  const where: Record<string, unknown> = {
    status,
  };

  // Search filter - sanitize and apply to subject and content
  if (search && search.length > 0) {
    where.OR = [
      { subject: { contains: search } },
      { content: { contains: search } },
    ];
  }

  // Topic filter - exact match on topic name
  if (topic) {
    // Fetch the topic ID from the economic_board_topics table by name
    const topicRecord = await MyGlobal.prisma.economic_board_topics.findUnique({
      where: { name: topic },
    });

    if (!topicRecord) {
      // If topic doesn't exist, return empty results
      return {
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }

    where.economic_board_topics_id = topicRecord.id;
  }

  // Date filters
  if (createdAfter) {
    where.created_at = {
      ...(where.created_at as Record<string, unknown>),
      gte: createdAfter,
    };
  }

  if (createdBefore) {
    where.created_at = {
      ...(where.created_at as Record<string, unknown>),
      lte: createdBefore,
    };
  }

  // Validate sorting field is allowed
  const allowedSortFields = ["created_at", "updated_at", "reply_count"];
  const finalSortBy = allowedSortFields.includes(sortBy)
    ? sortBy
    : "created_at";

  // Validate order direction
  const validOrders = ["asc", "desc"];
  const finalOrder = validOrders.includes(order) ? order : "desc";

  // Execute the query with pagination
  const [results, total] = await Promise.all([
    MyGlobal.prisma.economic_board_posts.findMany({
      where,
      orderBy: { [finalSortBy]: finalOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_posts.count({ where }),
  ]);

  // Transform all Date fields to ISO strings (though Prisma returns them as strings already)
  const transformedResults = results.map((post) => ({
    id: post.id,
    economic_board_topics_id: post.economic_board_topics_id,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    status: post.status satisfies string as
      | "pending"
      | "published"
      | "rejected"
      | "deleted",
    subject: post.subject,
    content: post.content,
    reply_count: post.reply_count,
    edited: post.edited,
    edited_at: post.edited_at ? toISOStringSafe(post.edited_at) : undefined,
    author_hash: post.author_hash,
    admin_id: post.admin_id,
    moderation_reason: post.moderation_reason,
  }));

  // Return paginated results
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedResults,
  };
}
