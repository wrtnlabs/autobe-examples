import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Find the cart item and verify ownership
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    select: {
      id: true,
      customer_id: true,
      product_variant_id: true,
      deleted_at: true,
    },
  });
  // Not found or soft-deleted
  if (cartItem === null || cartItem.deleted_at !== null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Ownership check - customers can only modify their own cart items
  if (cartItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the cart item with new quantity and refreshed timestamp
  const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    },
    ...EcommerceMallCartItemTransformer.select(),
  });
  // Calculate available stock for this variant to determine stockAvailability
  const inventoryResult =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: {
        product_variant_id: cartItem.product_variant_id,
      },
      _sum: {
        quantity_change: true,
      },
    });
  const availableStock = inventoryResult._sum.quantity_change ?? 0;
  return await EcommerceMallCartItemTransformer.transform(updated, {
    availableStock,
  });
}
