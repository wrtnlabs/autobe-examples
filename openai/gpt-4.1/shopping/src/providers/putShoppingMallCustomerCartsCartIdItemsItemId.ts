import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // 1. Load cart item with SKU and cart info plus parent product info
  const item = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.itemId },
    include: {
      cart: true,
      productSku: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!item) {
    throw new HttpException("Cart item not found", 404);
  }
  // 2. Ownership: Ensure customer owns this cart
  if (!item.cart || item.cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your cart", 403);
  }
  // 3. Quantity validation
  if (props.body.quantity > item.productSku.stock) {
    throw new HttpException(
      "Requested quantity exceeds available inventory",
      400,
    );
  }
  // 4. Update quantity and timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.itemId },
    data: {
      quantity: props.body.quantity,
      updated_at: now,
    },
    include: {
      productSku: {
        include: {
          product: true,
        },
      },
    },
  });
  const productSku = updated.productSku;
  // Derive productSku summary for return DTO
  const sku_summary: IShoppingMallProductSku.ISummary = {
    id: productSku.id,
    code: productSku.sku_code,
    product_title: productSku.product?.title ?? "",
    option_summary: "", // Not available on SKU -- spec not implemented
    in_stock: productSku.stock > 0 && productSku.status === "active",
  };
  return {
    id: updated.id,
    shopping_mall_cart_id: updated.shopping_mall_cart_id,
    quantity: updated.quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    productSku: sku_summary,
  };
}
