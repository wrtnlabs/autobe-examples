import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardChannels(props: {
  body: IDiscussionBoardChannel.IRequest;
}): Promise<IPageIDiscussionBoardChannel.ISummary> {
  const {
    page,
    limit,
    search,
    status,
    order_by,
    order,
    created_after,
    created_before,
  } = props.body;

  const skip = (page - 1) * limit;

  // Build where condition
  const where: Record<string, unknown> = {
    deleted_at: null, // Only non-deleted channels
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (created_after || created_before) {
    where.created_at = {};
    const createdAt = where.created_at as Record<string, unknown>;
    if (created_after) {
      createdAt.gte = created_after;
    }
    if (created_before) {
      createdAt.lte = created_before;
    }
  }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (order_by) {
    orderBy[order_by] = order || "asc";
  } else {
    orderBy.created_at = "desc"; // Default sorting
  }

  try {
    // Execute queries concurrently
    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_channels.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      MyGlobal.prisma.discussion_board_channels.count({ where }),
    ]);

    // Convert to API response format
    const channelData = data.map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      status: channel.status,
      created_at: toISOStringSafe(channel.created_at),
    }));

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: channelData,
    };
  } catch (error) {
    throw new HttpException(
      "Failed to retrieve discussion board channels",
      500,
    );
  }
}
