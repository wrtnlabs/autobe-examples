import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallShipmentCollector } from "../collectors/ECommerceMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallShipmentTransformer } from "../transformers/ECommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IECommerceMallShipment.ICreate;
}): Promise<IECommerceMallShipment> {
  // 1. Verify seller approval status is 'approved'
  const sellerRecord =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { id: true, approval_status: true },
    });
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException(
      "Seller approval is required before creating shipments",
      403,
    );
  }
  // 2. Load all order items with their product variant and product ownership info
  const orderItems = await MyGlobal.prisma.e_commerce_mall_order_items.findMany(
    {
      where: { id: { in: props.body.orderItemIds } },
      select: {
        id: true,
        status: true,
        productVariant: {
          select: {
            product: {
              select: { seller_id: true },
            },
          },
        },
        shipmentItem: {
          select: { id: true },
        },
      },
    },
  );
  // 3. Validate each order item
  const orderItemMap = new Map(orderItems.map((oi) => [oi.id, oi]));
  for (const orderItemId of props.body.orderItemIds) {
    const orderItem = orderItemMap.get(orderItemId);
    if (orderItem === undefined) {
      throw new HttpException(`Order item ${orderItemId} not found`, 404);
    }
    if (orderItem.productVariant.product.seller_id !== props.seller.id) {
      throw new HttpException(
        `Order item ${orderItemId} does not belong to this seller`,
        403,
      );
    }
    if (orderItem.status !== "paid") {
      throw new HttpException(
        `Order item ${orderItemId} must have 'paid' status to be shipped`,
        400,
      );
    }
    if (orderItem.shipmentItem !== null) {
      throw new HttpException(
        `Order item ${orderItemId} is already assigned to another shipment`,
        400,
      );
    }
  }
  // 4. Create shipment using collector (includes nested shipment_items create)
  const record = await MyGlobal.prisma.e_commerce_mall_shipments.create({
    data: await ECommerceMallShipmentCollector.collect({
      body: props.body,
      eCommerceMallSellers: { id: props.seller.id },
      eCommerceMallSellerSessions: { id: props.seller.session_id },
    }),
    ...ECommerceMallShipmentTransformer.select(),
  });
  // 5. Update all included order items' status to 'shipped'
  await MyGlobal.prisma.e_commerce_mall_order_items.updateMany({
    where: { id: { in: props.body.orderItemIds } },
    data: { status: "shipped", updated_at: new Date() },
  });
  // 6. Create status log entries for the transition from 'paid' to 'shipped'
  const now = new Date();
  await MyGlobal.prisma.e_commerce_mall_order_item_status_logs.createMany({
    data: props.body.orderItemIds.map((orderItemId) => ({
      id: v4(),
      e_commerce_mall_order_item_id: orderItemId,
      from_status: "paid",
      to_status: "shipped",
      reason: "shipment_created",
      created_at: now,
      updated_at: now,
    })),
  });
  // 7. Return the created shipment via transformer
  return await ECommerceMallShipmentTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
// import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSellerShipments(props: {
//   seller: SellerPayload;
//   body: IECommerceMallShipment.ICreate;
// }): Promise<IECommerceMallShipment> {
//   const record = await MyGlobal.prisma.e_commerce_mall_shipments.create({
//     data: await ECommerceMallShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallShipmentTransformer.select(),
//   });
//   return await ECommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------