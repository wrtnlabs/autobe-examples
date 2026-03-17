import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Step 1: Find cart item and verify ownership
  const existing = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
      product_variant_id: true,
    },
  });
  if (existing === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Step 2: Check variant availability to recalculate availability_status
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: existing.product_variant_id },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  let newAvailabilityStatus: string;
  if (variant.deleted_at !== null) {
    newAvailabilityStatus = "variant_deleted";
  } else {
    const inventoryAgg =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { productVariant: { id: existing.product_variant_id } },
        _sum: { quantity: true },
      });
    const totalStock = inventoryAgg._sum?.quantity ?? 0;
    newAvailabilityStatus = totalStock === 0 ? "out_of_stock" : "available";
  }
  // Step 3: Update the cart item with new quantity, status, and timestamp
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      availability_status: newAvailabilityStatus,
      updated_at: new Date(),
    },
  });
  // Step 4: Fetch updated record and transform to response DTO
  const updated =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return ShoppingMallCartItemTransformer.transform(updated);
}
