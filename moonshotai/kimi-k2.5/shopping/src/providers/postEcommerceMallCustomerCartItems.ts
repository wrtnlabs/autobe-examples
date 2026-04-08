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
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Verify product variant exists and is active (not deleted)
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.body.productVariantId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Check for existing cart item for this customer + variant combination
  const existing = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
    where: {
      customer_id: props.customer.id,
      product_variant_id: props.body.productVariantId,
      deleted_at: null,
    },
  });
  if (existing) {
    // Combine quantities per requirement: update existing cart item
    const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + props.body.quantity,
        updated_at: new Date(),
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
    return await EcommerceMallCartItemTransformer.transform(updated);
  }
  // Create new cart item using Collector
  const created = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
    data: await EcommerceMallCartItemCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
    }),
    ...EcommerceMallCartItemTransformer.select(),
  });
  return await EcommerceMallCartItemTransformer.transform(created);
}
