import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

interface SellerPayload {
  id: string & tags.Format<"uuid">;
  email: string;
  session_id: string & tags.Format<"uuid">;
}
export async function patchEcommerceMallShipmentsShipmentIdItems(props: {
  shipmentId: string & tags.Format<"uuid">;
  seller: SellerPayload;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<IEcommerceMallShipment.ISummary> {
  if (!props.body.orderItemIds || props.body.orderItemIds.length === 0) {
    throw new HttpException("Order item IDs are required", 400);
  }
  const orderItemIds = props.body.orderItemIds;
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      ecommerce_mall_seller_id: true,
      carrier: true,
      tracking_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.seller.approval_status !== "approved") {
    throw new HttpException("Seller account is not approved", 403);
  }
  if (shipment.seller.deleted_at !== null) {
    throw new HttpException("Seller account is suspended", 403);
  }
  if (shipment.tracking_number && shipment.tracking_number.trim() !== "") {
    throw new HttpException(
      "Cannot add items to shipment after tracking information has been added",
      400,
    );
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: orderItemIds },
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      status: true,
      product: {
        select: {
          id: true,
          ecommerce_mall_seller_id: true,
        },
      },
    },
  });
  if (orderItems.length !== orderItemIds.length) {
    const foundIds = orderItems.map((item) => item.id);
    const missingIds = orderItemIds.filter((id) => !foundIds.includes(id));
    throw new HttpException(
      `Order items not found: ${missingIds.join(", ")}`,
      404,
    );
  }
  for (const item of orderItems) {
    if (item.ecommerce_mall_order_id !== shipment.ecommerce_mall_order_id) {
      throw new HttpException(
        `Order item ${item.id} does not belong to the same order as the shipment`,
        400,
      );
    }
    if (item.status !== "paid") {
      throw new HttpException(
        `Order item ${item.id} must have 'paid' status. Current status: ${item.status}`,
        400,
      );
    }
    if (
      item.product.ecommerce_mall_seller_id !==
      shipment.ecommerce_mall_seller_id
    ) {
      throw new HttpException(
        `Order item ${item.id} does not belong to the same seller as the shipment`,
        400,
      );
    }
  }
  const existingShipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: {
        ecommerce_mall_order_item_id: { in: orderItemIds },
      },
      select: {
        ecommerce_mall_order_item_id: true,
      },
    });
  if (existingShipmentItems.length > 0) {
    const assignedItemIds = existingShipmentItems.map(
      (item) => item.ecommerce_mall_order_item_id,
    );
    throw new HttpException(
      `Order items already assigned to a shipment: ${assignedItemIds.join(", ")}`,
      400,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const shipmentItemCreates = orderItemIds.map((orderItemId) => ({
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_shipment_id: props.shipmentId,
      ecommerce_mall_order_item_id: orderItemId,
      created_at: now,
    }));
    await tx.ecommerce_mall_shipment_items.createMany({
      data: shipmentItemCreates,
    });
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: now,
      },
    });
  });
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    });
  return await EcommerceMallShipmentAtSummaryTransformer.transform(
    updatedShipment,
  );
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallShipmentsShipmentIdItems(props: {
//   shipmentId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShipment.IUpdate;
// }): Promise<IEcommerceMallShipment.ISummary> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------