import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductPurchaseSnapshotCollector } from "../collectors/ShoppingMallProductPurchaseSnapshotCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductPurchaseSnapshotTransformer } from "../transformers/ShoppingMallProductPurchaseSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallProductPurchaseSnapshot.ICreate;
}): Promise<IShoppingMallProductPurchaseSnapshot> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id === props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        unit_price: true,
        shopping_mall_product_variant_id: true,
        productVariant: {
          select: {
            shopping_mall_product_id: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    });
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshots.findUnique({
      where: {
        shopping_mall_order_item_id: props.itemId,
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException(
      "Product purchase snapshot already exists for this order item",
      409,
    );
  }
  if (props.body.unit_price !== orderItem.unit_price) {
    throw new HttpException(
      "Snapshot unit price must match the order item unit price",
      400,
    );
  }
  if (
    props.body.shopping_mall_product_variant_id !== undefined &&
    props.body.shopping_mall_product_variant_id !== null &&
    props.body.shopping_mall_product_variant_id !==
      orderItem.shopping_mall_product_variant_id
  ) {
    throw new HttpException(
      "Snapshot product variant does not match the purchased order item",
      400,
    );
  }
  if (
    props.body.shopping_mall_product_id !== undefined &&
    props.body.shopping_mall_product_id !== null &&
    props.body.shopping_mall_product_id !==
      orderItem.productVariant.shopping_mall_product_id
  ) {
    throw new HttpException(
      "Snapshot product does not match the purchased order item",
      400,
    );
  }
  if (props.body.optionValues !== undefined) {
    const optionNames = new Set<string>();
    const displayOrders = new Set<number>();
    for (const option of props.body.optionValues) {
      if (optionNames.has(option.option_name)) {
        throw new HttpException(
          "Duplicate option name in snapshot payload",
          400,
        );
      }
      if (displayOrders.has(option.display_order)) {
        throw new HttpException(
          "Duplicate display order in snapshot payload",
          400,
        );
      }
      optionNames.add(option.option_name);
      displayOrders.add(option.display_order);
    }
  }
  const shoppingMallOrders: IEntity = { id: props.orderId };
  const shoppingMallOrderItems: IEntity = { id: props.itemId };
  const created = await MyGlobal.prisma.$transaction(async (prisma) =>
    prisma.shopping_mall_product_purchase_snapshots.create({
      data: await ShoppingMallProductPurchaseSnapshotCollector.collect({
        body: props.body,
        shoppingMallOrders,
        shoppingMallOrderItems,
      }),
      ...ShoppingMallProductPurchaseSnapshotTransformer.select(),
    }),
  );
  return await ShoppingMallProductPurchaseSnapshotTransformer.transform(
    created,
  );
}
