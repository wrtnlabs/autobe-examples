import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminGuests(props: {
  admin: AdminPayload;
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const { body } = props;

  const page = body.page >= 1 ? body.page : 1;
  const limit = body.limit >= 1 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined
      ? {
          OR: [
            { session_token: { contains: body.search } },
            { user_agent: { contains: body.search } },
          ],
        }
      : {}),
    ...(body.ipAddress !== undefined && body.ipAddress !== null
      ? { ip_address: body.ipAddress }
      : {}),
    ...(body.userAgent !== undefined && body.userAgent !== null
      ? { user_agent: body.userAgent }
      : {}),
  };

  const orderBy = body.sortBy
    ? {
        [body.sortBy]: (body.sortOrder === "asc" ? "asc" : "desc") as
          | "asc"
          | "desc",
      }
    : { created_at: "desc" as "asc" | "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_guests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        session_token: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_guests.count({
      where,
    }),
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
      session_token: row.session_token,
      ip_address: row.ip_address ?? null,
      user_agent: row.user_agent ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
