import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
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
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate variant exists and is active
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: { id: props.body.variant_id, deleted_at: null },
    });
  // Fetch the seller_id via the product relationship (since seller_id is not directly on variant)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: { id: variant.product_id, deleted_at: null },
    },
  );
  // Validate seller account is not suspended
  await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
    where: { id: product.seller_id, deleted_at: null },
  });
  // Validate variant has available stock
  if (variant.stock_quantity === 0) {
    throw new HttpException("Variant is out of stock", 400);
  }
  // Check if cart item already exists for this variant
  const existingCart = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        customer_id: props.customer.id,
        variant_id: props.body.variant_id,
        deleted_at: null,
      },
    },
  );
  if (existingCart) {
    // Update existing cart item (merge quantities)
    const newQuantity = existingCart.quantity + props.body.quantity;
    if (newQuantity > variant.stock_quantity) {
      throw new HttpException("Quantity exceeds available stock", 400);
    }
    const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingCart.id },
      data: {
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      },
    });
    return await ShoppingMallCartItemTransformer.transform(updated);
  } else {
    // Get the required snapshot data for Transformer
    const productSnapshot =
      await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
        where: { product_id: product.id },
        orderBy: { created_at: "desc" },
      });
    const variantSnapshot =
      await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
        {
          where: { variant: { id: variant.id } },
          orderBy: { created_at: "desc" },
        },
      );
    // Get seller
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow(
      {
        where: { id: product.seller_id },
      },
    );
    // Create a complete data object for create() with relation properties
    const data = {
      id: v4(),
      quantity: props.body.quantity,
      unit_price: variant.price || 0,
      item_total: props.body.quantity * (variant.price || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      variant: { connect: { id: props.body.variant_id } },
      productSnapshot: { connect: { id: productSnapshot.id } },
      variantSnapshot: { connect: { id: variantSnapshot.id } },
      seller: { connect: { id: seller.id } },
    } satisfies Prisma.shopping_mall_cart_itemsCreateInput;
    // Use the transformer's select for projection
    const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data,
      ...ShoppingMallCartItemTransformer.select(),
    });
    return await ShoppingMallCartItemTransformer.transform(created);
  }
}
