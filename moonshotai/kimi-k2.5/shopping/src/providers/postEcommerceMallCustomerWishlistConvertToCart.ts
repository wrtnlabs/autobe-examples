import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function postEcommerceMallCustomerWishlistConvertToCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.IConvertToCart;
}): Promise<IEcommerceMallCartItem> {
  // 1. Verify wishlist item exists and belongs to customer
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        id: props.body.wishlistItemId,
        customer_id: props.customer.id,
      },
      select: {
        id: true,
        product_id: true,
        product: {
          select: { deleted_at: true },
        },
      },
    });
  if (wishlistItem === null) {
    throw new HttpException("Wishlist item not found", 404);
  }
  // 2. Verify product is not soft-deleted
  if (wishlistItem.product.deleted_at !== null) {
    throw new HttpException("Product not available", 400);
  }
  // 3. Verify variant exists, is not soft-deleted, and belongs to the wishlisted product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.body.variantId,
        product_id: wishlistItem.product_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException(
      "Product variant not available or does not belong to wishlisted product",
      400,
    );
  }
  // 4. Check stock availability
  const inventoryRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: { product_variant_id: props.body.variantId },
      select: { quantity_change: true },
    });
  const currentStock = inventoryRecords.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  // 5. Check existing cart item and calculate total quantity
  const existingCartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
      where: {
        customer_id_product_variant_id: {
          customer_id: props.customer.id,
          product_variant_id: props.body.variantId,
        },
      },
      select: { id: true, quantity: true },
    });
  const totalQuantity = (existingCartItem?.quantity ?? 0) + props.body.quantity;
  if (totalQuantity > currentStock) {
    throw new HttpException("Insufficient stock", 422);
  }
  // 6. Create or update cart item
  const now = new Date();
  let cartItemId: string & tags.Format<"uuid">;
  if (existingCartItem !== null) {
    // Update existing cart item
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: totalQuantity,
        updated_at: now,
      },
    });
    cartItemId = existingCartItem.id as string & tags.Format<"uuid">;
  } else {
    // Create new cart item
    cartItemId = v4();
    await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: {
        id: cartItemId,
        customer: { connect: { id: props.customer.id } },
        productVariant: { connect: { id: props.body.variantId } },
        quantity: props.body.quantity,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // 7. Return cart item with full details
  const cartItemWithDetails =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: cartItemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  return await EcommerceMallCartItemTransformer.transform(cartItemWithDetails);
}
