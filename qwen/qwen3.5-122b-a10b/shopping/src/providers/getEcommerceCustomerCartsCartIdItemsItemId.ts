import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceProductVariantAtSummaryTransformer } from "../transformers/EcommerceProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCartItem> {
  // Validate cart exists and belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_carts.findFirst({
    where: {
      id: props.cartId,
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (cart === null) {
    throw new HttpException("Cart not found", 404);
  }
  // Find cart item with product variant join
  const record = await MyGlobal.prisma.ecommerce_cart_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_cart_id: props.cartId,
      deleted_at: null,
    },
    select: {
      id: true,
      quantity: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      ecommerce_product_variant_id: true,
      productVariant: EcommerceProductVariantAtSummaryTransformer.select(),
    },
  } satisfies Prisma.ecommerce_cart_itemsFindManyArgs);
  if (record === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Compute availability status from inventory records
  const inventorySum = await MyGlobal.prisma.ecommerce_inventory_records
    .groupBy({
      by: ["ecommerce_product_variant_id"],
      where: {
        ecommerce_product_variant_id: record.ecommerce_product_variant_id,
      },
      _sum: {
        quantity_change: true,
      },
    })
    .then((groups) =>
      groups.reduce((sum, g) => sum + (g._sum?.quantity_change ?? 0), 0),
    );
  const availabilityStatus = inventorySum > 0;
  // Transform product variant
  const productVariant =
    await EcommerceProductVariantAtSummaryTransformer.transform(
      record.productVariant,
    );
  // Update stock_count with computed inventory
  const updatedProductVariant: IEcommerceProductVariant.ISummary = {
    ...productVariant,
    stock_count: inventorySum,
  };
  return {
    id: record.id,
    quantity: record.quantity,
    productVariant: updatedProductVariant,
    availabilityStatus,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  } satisfies IEcommerceCartItem;
}
