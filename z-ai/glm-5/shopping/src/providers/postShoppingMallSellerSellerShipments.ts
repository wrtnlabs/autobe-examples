import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // 1. Verify the order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.body.orderId },
  });
  // 2. Fetch and validate order items
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
      shopping_mall_seller_id: props.seller.id,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_seller_id: true,
      status: true,
      shopping_mall_shipment_id: true,
    },
  });
  // 3. Verify all items found and belong to this seller
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException(
      "Some order items not found or do not belong to this seller",
      400,
    );
  }
  // 4. Validate each item in a single pass
  for (const item of orderItems) {
    if (item.shopping_mall_order_id !== props.body.orderId) {
      throw new HttpException(
        "All order items must belong to the same order",
        400,
      );
    }
    if (item.status !== "paid") {
      throw new HttpException("All order items must have 'paid' status", 400);
    }
    if (item.shopping_mall_shipment_id !== null) {
      throw new HttpException("Some order items are already shipped", 400);
    }
  }
  // 5. Create shipment using collector
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: await ShoppingMallShipmentCollector.collect({
      body: props.body,
      shoppingMallSellers: { id: props.seller.id },
    }),
    ...ShoppingMallShipmentTransformer.select(),
  });
  // 6. Update order items to link to shipment and change status to 'shipped'
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { id: { in: props.body.orderItemIds } },
    data: {
      shopping_mall_shipment_id: shipment.id,
      status: "shipped",
      updated_at: new Date(),
    },
  });
  // 7. Fetch and return the complete shipment with all relations
  const result =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: shipment.id },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(result);
}
