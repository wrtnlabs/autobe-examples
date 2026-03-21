import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Validate variant exists
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.variant_id },
      include: {
        product: {
          include: {
            seller: {
              include: {
                sellerSuspensions: true,
              },
            },
          },
        },
      },
    });
  // Validate product is not deleted
  if (variant.product.deleted_at !== null) {
    throw new HttpException("Product is no longer available", 400);
  }
  // Validate seller is approved
  if (variant.product.seller.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 400);
  }
  // Validate seller is not suspended (check if any active suspension exists)
  const isSuspended = variant.product.seller.sellerSuspensions.some(
    (s) => s.restored_at === null,
  );
  if (isSuspended) {
    throw new HttpException("Seller is suspended", 400);
  }
  // Get or create customer's cart
  let cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { ecommerce_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  if (cart === null) {
    cart = await MyGlobal.prisma.ecommerce_mall_carts.create({
      data: {
        id: v4(),
        created_at: new Date(),
        updated_at: new Date(),
        customer: { connect: { id: props.customer.id } },
      },
      select: { id: true },
    });
  }
  // Check for existing cart item with same variant
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
      where: {
        ecommerce_mall_cart_id_ecommerce_mall_product_variant_id: {
          ecommerce_mall_cart_id: cart.id,
          ecommerce_mall_product_variant_id: props.body.variant_id,
        },
      },
    });
  let cartItemRecord: EcommerceMallCartItemTransformer.Payload;
  if (existingItem !== null) {
    // Update existing item with combined quantity
    const newQuantity = existingItem.quantity + props.body.quantity;
    if (newQuantity > 99) {
      throw new HttpException("Quantity exceeds maximum of 99", 400);
    }
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        updated_at: new Date(),
      },
    });
    cartItemRecord =
      await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
        where: { id: existingItem.id },
        ...EcommerceMallCartItemTransformer.select(),
      });
  } else {
    // Create new cart item
    cartItemRecord = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: await EcommerceMallCartItemCollector.collect({
        body: props.body,
        ecommerceMallCarts: { id: cart.id },
        ecommerceMallCustomerSessions: { id: props.customer.session_id },
      }),
      ...EcommerceMallCartItemTransformer.select(),
    });
  }
  return await EcommerceMallCartItemTransformer.transform(cartItemRecord);
}
