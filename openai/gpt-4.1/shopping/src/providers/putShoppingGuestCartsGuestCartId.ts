import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

export async function putShoppingGuestCartsGuestCartId(props: {
  guestCartId: string & tags.Format<"uuid">;
  body: IShoppingGuestCartItem.IUpdate;
}): Promise<IShoppingGuestCartItem> {
  type RawGuestCartItem = {
    shopping_sku_id: string & tags.Format<"uuid">;
    quantity: number;
  };
  // safe parse - props.body.items is RawGuestCartItem[]
  const items = props.body.items as unknown as RawGuestCartItem[];

  const cart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
  });
  if (!cart) {
    throw new HttpException("Guest cart not found", 404);
  }
  const now = toISOStringSafe(new Date());
  // Expiry check
  const expiresAt = toISOStringSafe(cart.expires_at);
  if (expiresAt < now) {
    throw new HttpException("Guest cart has expired", 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpException("'items' array must be non-empty", 400);
  }
  const skuIds = items.map((item) => item.shopping_sku_id);
  const validSkus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: skuIds }, deleted_at: null, is_active: true },
    select: { id: true },
  });
  const validSkuSet = new Set(validSkus.map((s) => s.id));
  for (const item of items) {
    if (!validSkuSet.has(item.shopping_sku_id)) {
      throw new HttpException(
        `SKU does not exist or inactive: ${item.shopping_sku_id}`,
        400,
      );
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      throw new HttpException(
        `Quantity for SKU ${item.shopping_sku_id} must be > 0`,
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_guest_cart_items.deleteMany({
    where: { shopping_guest_cart_id: props.guestCartId },
  });
  await MyGlobal.prisma.shopping_guest_cart_items.createMany({
    data: items.map((item) => ({
      id: v4() as string & tags.Format<"uuid">,
      shopping_guest_cart_id: props.guestCartId,
      shopping_sku_id: item.shopping_sku_id,
      quantity: item.quantity,
      added_at: now,
      updated_at: now,
    })),
  });
  const updatedCart = await MyGlobal.prisma.shopping_guest_carts.update({
    where: { id: props.guestCartId },
    data: { updated_at: now },
  });
  // Fetch raw items after update; must project to ISummary for the API's 'items' field
  const dbItems = await MyGlobal.prisma.shopping_guest_cart_items.findMany({
    where: { shopping_guest_cart_id: props.guestCartId },
    orderBy: { added_at: "asc" },
  });
  return {
    id: updatedCart.id,
    session_key: updatedCart.session_key,
    created_at: toISOStringSafe(updatedCart.created_at),
    updated_at: toISOStringSafe(updatedCart.updated_at),
    expires_at: toISOStringSafe(updatedCart.expires_at),
    items: dbItems.map((dbItem) => ({
      session_key: updatedCart.session_key,
      created_at: toISOStringSafe(updatedCart.created_at),
      updated_at: toISOStringSafe(updatedCart.updated_at),
      expires_at: toISOStringSafe(updatedCart.expires_at),
      items: [], // leave empty as placeholder
    })),
  };
}
