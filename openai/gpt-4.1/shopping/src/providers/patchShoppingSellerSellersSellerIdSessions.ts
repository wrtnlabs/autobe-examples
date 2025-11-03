import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerSession";
import { IPageIShoppingSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSellerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerSellersSellerIdSessions(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerSession.IRequest;
}): Promise<IPageIShoppingSellerSession> {
  const { seller, sellerId, body } = props;

  // Authorize: seller can access only their own sessions
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: Cannot view sessions of another seller",
      403,
    );
  }

  // Pagination defaults
  const page = body.page && body.page > 0 ? body.page : 1;
  let limit = body.limit && body.limit > 0 ? body.limit : 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  // Build Prisma where clause
  const where = {
    shopping_seller_id: sellerId,
    ...(body.created_after && { created_at: { gte: body.created_after } }),
    ...(body.created_before && { created_at: { lte: body.created_before } }),
    ...(typeof body.expired === "boolean" && {
      ...(body.expired ? { expired_at: { not: null } } : { expired_at: null }),
    }),
    ...(body.ip && { ip: body.ip }),
    ...(body.href && { href: body.href }),
    ...(body.referrer && { referrer: body.referrer }),
  };

  // Query sessions
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_seller_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_seller_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((row) => ({
      id: row.id,
      shopping_seller_id: row.shopping_seller_id,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: toISOStringSafe(row.created_at),
      expired_at: row.expired_at ? toISOStringSafe(row.expired_at) : null,
    })),
  };
}
