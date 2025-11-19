import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorGuests(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const { pagination, search, created_after, created_before, sort_by, order } =
    props.body;

  const page = pagination.current;
  const limit = pagination.limit;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.discussion_board_guestsWhereInput = {
    deleted_at: null,
    ...(search && {
      guest_token: { contains: search, mode: "insensitive" },
    }),
    ...(created_after && {
      created_at: { gte: new Date(created_after) },
    }),
    ...(created_before && {
      created_at: { lte: new Date(created_before) },
    }),
  };

  // Determine sorting
  const orderBy: Prisma.discussion_board_guestsOrderByWithRelationInput = {};
  if (sort_by === "guest_token") {
    orderBy.guest_token = order || "desc";
  } else if (sort_by === "updated_at") {
    orderBy.updated_at = order || "desc";
  } else {
    // Default to created_at
    orderBy.created_at = order || "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_guests.count({ where }),
  ]);

  // Transform results to match API interface
  const transformedData: IDiscussionBoardGuest.ISummary[] = data.map(
    (guest) => ({
      id: guest.id as string & tags.Format<"uuid">,
      guest_token: guest.guest_token,
      created_at: toISOStringSafe(guest.created_at),
      updated_at: toISOStringSafe(guest.updated_at),
      deleted_at: guest.deleted_at
        ? toISOStringSafe(guest.deleted_at)
        : undefined,
    }),
  );

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
