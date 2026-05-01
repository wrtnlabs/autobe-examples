import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // 1. Validate order exists (throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId, deleted_at: null },
    select: { id: true },
  });
  // 2. Verify seller is approved and in good standing
  const verifiedSeller =
    await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
      where: {
        id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        banned_at: true,
        suspended_at: true,
        approval_status: true,
      },
    });
  if (verifiedSeller.banned_at !== null) {
    throw new HttpException("Seller is banned", 403);
  }
  if (verifiedSeller.suspended_at !== null) {
    throw new HttpException("Seller is suspended", 403);
  }
  if (verifiedSeller.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
  }
  // 3. Framework validates body (typia enforces MinItems, non-empty strings)
  // 4. Deduplicate orderItemIds
  const uniqueItemIds: (string & tags.Format<"uuid">)[] = [
    ...new Set(props.body.orderItemIds),
  ];
  // 5. Validate all order items exist, are paid, and not yet shipped
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: uniqueItemIds },
      shopping_mall_order_id: props.orderId,
    },
    select: {
      id: true,
      status: true,
      shopping_mall_shipment_id: true,
      shopping_mall_product_variant_id: true,
    },
  });
  if (orderItems.length !== uniqueItemIds.length) {
    throw new HttpException(
      "Some order items do not belong to this order",
      400,
    );
  }
  for (const item of orderItems) {
    if (item.status !== "paid") {
      throw new HttpException(
        `Order item ${item.id} is not in paid status`,
        400,
      );
    }
    if (item.shopping_mall_shipment_id !== null) {
      throw new HttpException(
        `Order item ${item.id} is already assigned to a shipment`,
        400,
      );
    }
  }
  // 6. Verify all order items belong to the authenticated seller
  const variantIds: string[] = orderItems.map(
    (item) => item.shopping_mall_product_variant_id,
  );
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  const productIds: string[] = [
    ...new Set(variants.map((v) => v.shopping_mall_product_id)),
  ];
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: { id: { in: productIds } },
    select: { id: true, shopping_mall_seller_id: true },
  });
  for (const product of products) {
    if (product.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException(
        "Some order items belong to a different seller",
        403,
      );
    }
  }
  // Collect create data from the collector
  const collectResult = await ShoppingMallShipmentCollector.collect({
    body: props.body,
    shoppingMallOrders: { id: props.orderId },
    shoppingMallSellers: { id: props.seller.id },
    shoppingMallSellerSessions: { id: props.seller.session_id },
  });
  // Remove orderItems.connect from create data — we handle item updates manually
  const { orderItems: _unusedOrderItems, ...createData } = collectResult;
  // 7-9. Create shipment, update order items, recalculate order status (transaction)
  const shipmentRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipment = await tx.shopping_mall_shipments.create({
      data: createData,
      select: { id: true },
    });
    const updateResult = await tx.shopping_mall_order_items.updateMany({
      where: { id: { in: uniqueItemIds } },
      data: {
        shopping_mall_shipment_id: shipment.id,
        status: "shipped",
        updated_at: new Date(),
      },
    });
    if (updateResult.count === 0) {
      throw new HttpException(
        "Order items were claimed by a concurrent shipment",
        409,
      );
    }
    // Recalculate order status from all items
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const statuses = allItems.map((i) => i.status);
    let orderStatus: string;
    if (statuses.every((s) => s === "paid")) {
      orderStatus = "paid";
    } else if (
      statuses.some((s) => s === "shipped") &&
      !statuses.some((s) => s === "delivered")
    ) {
      orderStatus = "shipped";
    } else if (statuses.every((s) => s === "delivered")) {
      orderStatus = "delivered";
    } else if (statuses.every((s) => s === "cancelled")) {
      orderStatus = "cancelled";
    } else if (statuses.every((s) => s === "refunded")) {
      orderStatus = "refunded";
    } else {
      orderStatus = "partially_completed";
    }
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: orderStatus, updated_at: new Date() },
    });
    return shipment;
  });
  // 10. Fetch complete shipment with all relations and transform
  const complete =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentRecord.id },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(complete);
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
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
// import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IShoppingMallShipment.ICreate;
// }): Promise<IShoppingMallShipment> {
//   const record = await MyGlobal.prisma.shopping_mall_shipments.create({
//     data: await ShoppingMallShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallShipmentTransformer.select(),
//   });
//   return await ShoppingMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------