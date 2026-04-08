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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
}): Promise<IEcommerceMallCartItem> {
  // Get the base select from transformer
  const baseSelect = EcommerceMallCartItemTransformer.select();
  // Extract select fields, excluding customer if present to avoid type conflict
  const { customer, ...baseSelectRest } = (baseSelect as any).select;
  // Query the cart item with all related data including customer id
  const cartItem: any =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        ...baseSelectRest,
        customer: {
          select: {
            id: true,
          },
        },
      },
    });
  // Verify ownership - cart item must belong to the authenticated customer
  if (cartItem.customer?.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate available stock for the variant
  const inventoryRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: { product_variant_id: cartItem.productVariant?.id },
      select: { quantity_change: true },
    });
  const availableStock = inventoryRecords.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  // Transform and return the cart item with stock context
  return await EcommerceMallCartItemTransformer.transform(cartItem as any, {
    availableStock,
  });
}
