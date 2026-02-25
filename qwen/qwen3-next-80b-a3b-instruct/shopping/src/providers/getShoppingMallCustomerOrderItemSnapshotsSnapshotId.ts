import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string;
}): Promise<IShoppingMallOrderItemSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product_name: true,
        product_description: true,
        category_id: true,
        category_name: true,
        base_price: true,
        thumbnail_image_url: true,
        all_product_images: true,
        variant_sku: true,
        variant_price: true,
        option_values: true,
        stock_at_time_of_purchase: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
        snapshot_hash: true,
        orderItem: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        product: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        variant: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      },
    });
  // Validate that the order associated with this snapshot belongs to the customer
  const belongsToCustomer =
    await MyGlobal.prisma.shopping_mall_orders.findFirst({
      where: {
        id: snapshot.orderItem.id,
        customer_id: props.customer.id,
      },
    });
  if (!belongsToCustomer) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallOrderItemSnapshotTransformer.transform(snapshot);
}
