import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCartItemCollector } from "../collectors/EcommerceCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemTransformer } from "../transformers/EcommerceCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceCartItem.ICreate;
}): Promise<IEcommerceCartItem> {
  // Verify product variant stock using inventory table
  const inventory =
    await MyGlobal.prisma.ecommerce_variant_inventories.findFirst({
      where: {
        ecommerce_product_variant_id: props.body.product_variant_id,
      },
    });
  if (!inventory || inventory.quantity <= 0) {
    throw new HttpException("Product variant out of stock", 400);
  }
  // Check if cart item exists for customer and variant
  const existingItem = await MyGlobal.prisma.ecommerce_cart_items.findUnique({
    where: {
      customer_id_product_variant_id: {
        customer_id: props.customer.id,
        product_variant_id: props.body.product_variant_id,
      },
    },
    ...EcommerceCartItemTransformer.select(),
  });
  if (existingItem) {
    // Update existing cart item by quantity increment
    const updatedItem = await MyGlobal.prisma.ecommerce_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: { increment: props.body.quantity },
        updated_at: new Date(),
      },
      ...EcommerceCartItemTransformer.select(),
    });
    return await EcommerceCartItemTransformer.transform(updatedItem);
  }
  // Create new cart item using Collector
  const createdItem = await MyGlobal.prisma.ecommerce_cart_items.create({
    data: await EcommerceCartItemCollector.collect({
      body: props.body,
      ecommerceCustomers: { id: props.customer.id },
    }),
    ...EcommerceCartItemTransformer.select(),
  });
  return await EcommerceCartItemTransformer.transform(createdItem);
}
