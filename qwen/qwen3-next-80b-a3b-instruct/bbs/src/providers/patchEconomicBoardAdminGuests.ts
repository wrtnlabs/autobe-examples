import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";
import { IPageIEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconomicBoardAdminGuests(props: {
  admin: AdminPayload;
  body: IEconomicBoardGuest.IRequest;
}): Promise<IPageIEconomicBoardGuest> {
  const { body } = props;

  // Build where conditions using conditional spread (no Record<string, unknown>)
  const where = {
    ...(body.created_after && { created_at: { gte: body.created_after } }),
    ...(body.created_before && { created_at: { lte: body.created_before } }),
    ...(body.last_active_after && {
      last_active: { gte: body.last_active_after },
    }),
    ...(body.last_active_before && {
      last_active: { lte: body.last_active_before },
    }),
    ...(body.session_id_like && {
      session_id: { contains: body.session_id_like },
    }),
    ...(body.ip_hash_like && { ip_hash: { contains: body.ip_hash_like } }),
  };

  // Define sort and order inline
  const sort = body.sort_by || "created_at";
  const order = body.sort_order === "asc" ? "asc" : "desc";

  // Calculate pagination
  const page = body.page || 1;
  const limit = body.limit || 25;
  const skip = (page - 1) * limit;

  // Get data and count
  const [guests, total] = await Promise.all([
    MyGlobal.prisma.economic_board_guest.findMany({
      where,
      orderBy:
        sort === "created_at"
          ? { created_at: order }
          : sort === "last_active"
            ? { last_active: order }
            : { session_id: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_guest.count({ where }),
  ]);

  // Construct pagination object with plain numbers
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(total / limit),
  };

  // Convert Date properties to string using toISOStringSafe()
  const convertedGuests = guests.map((guest) => ({
    ...guest,
    created_at: toISOStringSafe(guest.created_at),
    last_active: toISOStringSafe(guest.last_active),
    ip_hash: guest.ip_hash satisfies string | null as string | undefined,
  }));

  return {
    pagination,
    data: convertedGuests,
  };
}
