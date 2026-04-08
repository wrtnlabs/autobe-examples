import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellersMeOrdersItemsItemIdShip(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Fetch the primary order item to derive the order
  const primaryItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_product_id: true,
        status: true,
      },
    });
  // Get the product to verify seller ownership
  const primaryProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: primaryItem.ecommerce_mall_product_id },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  // Authorization: items must belong to authenticated seller
  if (primaryProduct.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate primary item has 'paid' status
  if (primaryItem.status !== "paid") {
    throw new HttpException(
      `Item ${props.itemId} is not in paid status (current: ${primaryItem.status})`,
      400,
    );
  }
  // Fetch all order items to validate
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { id: { in: props.body.itemIds } },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      ecommerce_mall_product_id: true,
      status: true,
    },
  });
  // Verify all items exist
  if (orderItems.length !== props.body.itemIds.length) {
    const foundIds = new Set(orderItems.map((item) => item.id));
    const missingIds = props.body.itemIds.filter((id) => !foundIds.has(id));
    throw new HttpException(`Items not found: ${missingIds.join(", ")}`, 400);
  }
  const targetOrderId = primaryItem.ecommerce_mall_order_id;
  // Verify all items belong to the same order
  const mismatchedOrderItems = orderItems.filter(
    (item) => item.ecommerce_mall_order_id !== targetOrderId,
  );
  if (mismatchedOrderItems.length > 0) {
    throw new HttpException(
      `Items from different orders: ${mismatchedOrderItems.map((i) => i.id).join(", ")}`,
      400,
    );
  }
  // Fetch products to verify seller ownership
  const productIds = orderItems.map((item) => item.ecommerce_mall_product_id);
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: { id: { in: productIds } },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  const productSellerMap = new Map(
    products.map((p) => [p.id, p.ecommerce_mall_seller_id]),
  );
  // Check seller ownership and status
  const sellerMismatch: string[] = [];
  const statusMismatch: {
    id: string;
    status: string;
  }[] = [];
  for (const item of orderItems) {
    const itemSellerId = productSellerMap.get(item.ecommerce_mall_product_id);
    if (itemSellerId !== props.seller.id) {
      sellerMismatch.push(item.id);
    }
    if (item.status !== "paid") {
      statusMismatch.push({ id: item.id, status: item.status });
    }
  }
  if (sellerMismatch.length > 0) {
    throw new HttpException(
      `Items not belonging to seller: ${sellerMismatch.join(", ")}`,
      403,
    );
  }
  if (statusMismatch.length > 0) {
    throw new HttpException(
      `Items not in paid status: ${statusMismatch.map((i) => `${i.id} (${i.status})`).join(", ")}`,
      400,
    );
  }
  // Check no items already shipped (unique constraint enforcement)
  const existingShipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: { ecommerce_mall_order_item_id: { in: props.body.itemIds } },
      select: { ecommerce_mall_order_item_id: true },
    });
  if (existingShipmentItems.length > 0) {
    throw new HttpException(
      `Items already shipped: ${existingShipmentItems.map((s) => s.ecommerce_mall_order_item_id).join(", ")}`,
      409,
    );
  }
  // Fetch entities needed for collector
  const sellerEntity =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { id: true },
    });
  const orderEntity =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: targetOrderId },
      select: { id: true },
    });
  const orderItemEntities =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: { id: { in: props.body.itemIds } },
      select: { id: true },
    });
  // Create shipment with transaction for atomicity
  const now = new Date().toISOString();
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipmentId = v4();
    // Create the shipment
    const createdShipment = await tx.ecommerce_mall_shipments.create({
      data: {
        id: shipmentId,
        ecommerce_mall_order_id: targetOrderId,
        ecommerce_mall_seller_id: props.seller.id,
        carrier: props.body.carrier,
        tracking_number: props.body.trackingNumber,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create shipment items junction records
    await tx.ecommerce_mall_shipment_items.createMany({
      data: props.body.itemIds.map((itemId) => ({
        id: v4(),
        ecommerce_mall_shipment_id: shipmentId,
        ecommerce_mall_order_item_id: itemId,
        created_at: new Date(),
      })),
    });
    // Update all order items to 'shipped' status
    await tx.ecommerce_mall_order_items.updateMany({
      where: { id: { in: props.body.itemIds } },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return createdShipment;
  });
  // Fetch complete shipment with relations for response
  const completeShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: shipment.id },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(completeShipment);
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellersMeOrdersItemsItemIdShip(props: {
//   seller: SellerPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShipment.ICreate;
// }): Promise<IEcommerceMallShipment> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.create({
//     data: await EcommerceMallShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallShipmentTransformer.select(),
//   });
//   return await EcommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------