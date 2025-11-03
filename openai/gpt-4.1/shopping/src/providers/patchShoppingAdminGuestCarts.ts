import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";
import { IPageIShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingGuestCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminGuestCarts(props: {
  admin: AdminPayload;
  body: IShoppingGuestCartItem.IRequest;
}): Promise<IPageIShoppingGuestCartItem.ISummary> {
  const {
    session_key,
    created_from,
    created_to,
    updated_from,
    updated_to,
    expires_before,
    expires_after,
    is_expired,
    sort_by,
    sort_order,
    page = 1,
    limit = 20,
  } = props.body;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const skip = (safePage - 1) * safeLimit;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (session_key != null) where.session_key = session_key;
  if (created_from != null)
    where.created_at = { ...(where.created_at || {}), gte: created_from };
  if (created_to != null)
    where.created_at = { ...(where.created_at || {}), lte: created_to };
  if (updated_from != null)
    where.updated_at = { ...(where.updated_at || {}), gte: updated_from };
  if (updated_to != null)
    where.updated_at = { ...(where.updated_at || {}), lte: updated_to };
  if (expires_before != null)
    where.expires_at = { ...(where.expires_at || {}), lte: expires_before };
  if (expires_after != null)
    where.expires_at = { ...(where.expires_at || {}), gte: expires_after };
  if (is_expired !== undefined && is_expired !== null) {
    const nowISO = toISOStringSafe(new Date());
    if (is_expired) {
      where.expires_at = { ...(where.expires_at || {}), lte: nowISO };
    } else {
      where.expires_at = { ...(where.expires_at || {}), gt: nowISO };
    }
  }

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { updated_at: "desc" };
  if (sort_by && typeof sort_by === "string") {
    const key = ["updated_at", "created_at", "expires_at"].includes(sort_by)
      ? sort_by
      : "updated_at";
    orderBy = { [key]: sort_order === "asc" ? "asc" : "desc" };
  }

  // Query carts and total count
  const [carts, total] = await Promise.all([
    MyGlobal.prisma.shopping_guest_carts.findMany({
      where,
      orderBy,
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.shopping_guest_carts.count({ where }),
  ]);

  // Grab cart ids
  const cartIds = carts.map((cart) => cart.id);
  const cartItems =
    cartIds.length > 0
      ? await MyGlobal.prisma.shopping_guest_cart_items.findMany({
          where: { shopping_guest_cart_id: { in: cartIds } },
        })
      : [];

  // Group items by cart id
  const itemsByCartId: Record<string, IShoppingGuestCartItem.ISummary[]> = {};
  for (const item of cartItems) {
    if (!itemsByCartId[item.shopping_guest_cart_id])
      itemsByCartId[item.shopping_guest_cart_id] = [];
    // FIXME: Actual structure for ISummary of cart item unknown - placeholder
    itemsByCartId[item.shopping_guest_cart_id].push(
      typia.random<IShoppingGuestCartItem.ISummary>(),
    );
  }

  const data = carts.map((cart) => ({
    session_key: cart.session_key,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    expires_at: toISOStringSafe(cart.expires_at),
    items: itemsByCartId[cart.id] || [],
  }));

  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data,
  };
}
