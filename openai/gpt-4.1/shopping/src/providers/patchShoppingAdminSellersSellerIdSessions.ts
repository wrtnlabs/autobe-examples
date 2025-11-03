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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminSellersSellerIdSessions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerSession.IRequest;
}): Promise<IPageIShoppingSellerSession> {
  const { admin, sellerId, body } = props;

  // Confirm seller exists
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  // Pagination defaults
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build created_at conditionally
  let createdAtCond: Record<string, string> = {};
  if (body.created_after !== undefined && body.created_after !== null) {
    createdAtCond.gte = body.created_after;
  }
  if (body.created_before !== undefined && body.created_before !== null) {
    createdAtCond.lte = body.created_before;
  }
  // Build where conditions from filters
  const where: Record<string, unknown> = {
    shopping_seller_id: sellerId,
    ...(body.ip !== undefined && body.ip !== null && { ip: body.ip }),
    ...(body.href !== undefined && body.href !== null && { href: body.href }),
    ...(body.referrer !== undefined &&
      body.referrer !== null && { referrer: body.referrer }),
    ...(Object.keys(createdAtCond).length > 0 && { created_at: createdAtCond }),
  };
  // Handle expired filter
  if (body.expired === true) {
    where.expired_at = { not: null };
  } else if (body.expired === false) {
    where.expired_at = null;
  }

  // Query data and count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_seller_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_seller_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.shopping_seller_sessions.count({ where }),
  ]);

  const data = sessions.map((row) => ({
    id: row.id,
    shopping_seller_id: row.shopping_seller_id,
    ip: row.ip,
    href: row.href,
    referrer: row.referrer,
    created_at: toISOStringSafe(row.created_at),
    ...(row.expired_at !== null
      ? { expired_at: toISOStringSafe(row.expired_at) }
      : {}),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data,
  };
}
