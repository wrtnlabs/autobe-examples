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

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // 1. Verify the product variant exists (regardless of deleted_at)
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: { id: props.body.product_variant_id },
      select: {
        id: true,
        deleted_at: true,
        inventoryRecords: {
          select: { quantity: true },
        },
      },
    });
  // 2. Compute availability_status
  const totalStock = variant.inventoryRecords.reduce(
    (sum, r) => sum + r.quantity,
    0,
  );
  const availabilityStatus: string =
    variant.deleted_at !== null
      ? "variant_deleted"
      : totalStock === 0
        ? "out_of_stock"
        : "available";
  // 3. Upsert within a transaction
  const cartItemId = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_cart_items.findUnique({
      where: {
        customer_id_product_variant_id: {
          customer_id: props.customer.id,
          product_variant_id: props.body.product_variant_id,
        },
      },
      select: { id: true, quantity: true },
    });
    if (existing !== null) {
      // Update: consolidate quantities
      await tx.shopping_mall_cart_items.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + props.body.quantity,
          availability_status: availabilityStatus,
          updated_at: new Date(),
        },
      });
      return existing.id;
    } else {
      // Insert: create new cart item
      const newId = v4();
      await tx.shopping_mall_cart_items.create({
        data: {
          id: newId,
          quantity: props.body.quantity,
          availability_status: availabilityStatus,
          created_at: new Date(),
          updated_at: new Date(),
          customer: { connect: { id: props.customer.id } },
          productVariant: { connect: { id: props.body.product_variant_id } },
        },
      });
      return newId;
    }
  });
  // 4. Fetch and return the resulting cart item using the transformer
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return ShoppingMallCartItemTransformer.transform(cartItem);
}
