import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function postShoppingMallCustomerCart(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate variant exists and is not deleted, with product and seller info
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.body.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        price: true,
        product: {
          select: {
            id: true,
            base_price: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                approval_status: true,
              },
            },
          },
        },
      },
    });
  // Validate product is not deleted
  if (variant.product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Validate seller is approved (not suspended, rejected, or pending)
  if (variant.product.seller.approval_status !== "approved") {
    throw new HttpException("Seller is not available", 400);
  }
  // Calculate unit_price: use variant price if set, otherwise product base_price
  const unitPrice = variant.price ?? variant.product.base_price;
  // Check for existing cart item (unique constraint on customer + variant)
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        shopping_customer_id: props.customer.id,
        shopping_product_variant_id: props.body.variantId,
      },
    },
  );
  if (existingItem) {
    // Update existing item - combine quantities, cap at 99
    const newQuantity = Math.min(
      existingItem.quantity + props.body.quantity,
      99,
    );
    const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        updated_at: new Date(),
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
    return await ShoppingMallCartItemTransformer.transform(updated);
  }
  // Create new cart item using connect syntax for relations
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: v4(),
      quantity: props.body.quantity,
      unit_price: unitPrice,
      created_at: new Date(),
      updated_at: new Date(),
      customer: { connect: { id: props.customer.id } },
      variant: { connect: { id: props.body.variantId } },
    },
    ...ShoppingMallCartItemTransformer.select(),
  });
  return await ShoppingMallCartItemTransformer.transform(created);
}
