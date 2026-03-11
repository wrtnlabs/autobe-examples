import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Validate variant exists and get seller reference
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.variant_id },
      select: {
        id: true,
        stock_quantity: true,
        price_override: true,
        product: { select: { seller_id: true } },
      },
    });
  // Validate seller not suspended
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: variant.product.seller_id },
      select: { deleted_at: true },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller is suspended", 403);
  }
  // Validate quantity availability
  if (props.body.quantity < 1 || props.body.quantity > variant.stock_quantity) {
    throw new HttpException("Invalid quantity", 400);
  }
  // Check existing cart item
  const existing = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
    where: {
      user_id: props.customer.id,
      variant_id: props.body.variant_id,
    },
  });
  let created;
  if (existing) {
    const newQuantity = existing.quantity + props.body.quantity;
    created = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
      ...EcommerceMallCartItemTransformer.select(),
    });
  } else {
    created = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: await EcommerceMallCartItemCollector.collect({
        body: props.body,
        customer: { id: props.customer.id },
      }),
      ...EcommerceMallCartItemTransformer.select(),
    });
  }
  // Compute subtotal and availability from loaded data
  const price = variant.price_override ?? 0;
  const subtotal = price * created.quantity;
  const isAvailable = variant.stock_quantity > 0;
  return {
    id: created.id,
    user_id: created.user_id,
    variant_id: created.variant_id,
    quantity: created.quantity,
    subtotal: subtotal,
    is_available: isAvailable,
    created_at: created.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: created.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    user: await EcommerceMallCustomerAtSummaryTransformer.transform(
      created.customer,
    ),
    variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
      created.variant,
    ),
  };
}
