import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  const now = new Date();
  // 1. Find or create cart for customer
  let cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
  });
  if (!cart) {
    cart = await MyGlobal.prisma.shopping_mall_carts.create({
      data: {
        id: v4(),
        customer: { connect: { id: props.customer.id } },
        created_at: now,
        updated_at: now,
      },
    });
  }
  // 2. Validate variant with product and seller joins
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.variant_id },
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        deleted_at: true,
        created_at: true,
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                logo_image: true,
                suspended: true,
                banned: true,
                deleted_at: true,
              },
            },
          },
        },
        inventoryRecords: {
          select: { quantity_change: true },
        },
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("This variant is no longer available", 400);
  }
  // 3. Calculate stock
  const stockQuantity = variant.inventoryRecords.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  if (stockQuantity <= 0) {
    throw new HttpException("This variant is currently out of stock", 400);
  }
  // 4. Validate seller status
  const seller = variant.product.seller;
  if (seller.suspended || seller.banned || seller.deleted_at !== null) {
    throw new HttpException("Seller is not available", 400);
  }
  // 5. Self-purchase prevention
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { email: true },
  });
  if (customer && customer.email === seller.email) {
    throw new HttpException("Cannot purchase your own products", 400);
  }
  // 6. Check for existing cart item (using unique constraint)
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        shopping_mall_cart_id: cart.id,
        shopping_mall_product_variant_id: props.body.variant_id,
      },
    },
  );
  let cartItemRecord;
  if (existingItem) {
    // Merge quantities
    const newQuantity = existingItem.quantity + props.body.quantity;
    const unavailable = newQuantity > stockQuantity;
    cartItemRecord = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        unavailable,
        updated_at: now,
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  } else {
    // Create new cart item
    const unavailable = props.body.quantity > stockQuantity;
    cartItemRecord = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: {
        id: v4(),
        quantity: props.body.quantity,
        unavailable,
        created_at: now,
        updated_at: now,
        cart: { connect: { id: cart.id } },
        variant: { connect: { id: props.body.variant_id } },
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  }
  // 7. Update cart's updated_at timestamp
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cart.id },
    data: { updated_at: now },
  });
  // 8. Transform and return
  return await ShoppingMallCartItemTransformer.transform(cartItemRecord);
}
