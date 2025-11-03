import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCart";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminCartsCartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingCart> {
  // Find the cart (do not include soft-deleted carts)
  const cart = await MyGlobal.prisma.shopping_carts.findFirst({
    where: { id: props.cartId },
    include: {
      customer: true,
      shopping_cart_items: {
        include: {
          sku: true,
        },
      },
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  // Compose customer summary
  const customer = cart.customer;
  const customerSummary: IShoppingCustomer.ISummary = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    is_active: customer.is_active,
    created_at: toISOStringSafe(customer.created_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  };
  // Compose items
  const items: IShoppingCartItem[] = cart.shopping_cart_items.map((item) => ({
    id: item.id,
    shopping_cart_id: item.shopping_cart_id,
    sku: {
      id: item.sku.id,
      sku_code: item.sku.sku_code,
      price: item.sku.price,
      is_active: item.sku.is_active,
      status: item.sku.status,
    },
    quantity: item.quantity,
    added_at: toISOStringSafe(item.added_at),
    updated_at: toISOStringSafe(item.updated_at),
    cart_owner: customerSummary,
    // error_flags omitted (undefined)
  }));
  return {
    id: cart.id,
    customer: customerSummary,
    items,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
  };
}
