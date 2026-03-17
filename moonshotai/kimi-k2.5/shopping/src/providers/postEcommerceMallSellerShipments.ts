import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Validate all order items exist and are in 'paid' status
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
    },
    select: {
      id: true,
      status: true,
      seller_id: true,
      shipmentItem: {
        select: { id: true },
      },
    },
  });
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("One or more order items not found", 400);
  }
  // Verify all items belong to the authenticated seller
  const sellerMismatch = orderItems.find(
    (item) => item.seller_id !== props.seller.id,
  );
  if (sellerMismatch) {
    throw new HttpException(
      "Order items must belong to the authenticated seller",
      403,
    );
  }
  // Verify all items have 'paid' status
  const invalidStatus = orderItems.find((item) => item.status !== "paid");
  if (invalidStatus) {
    throw new HttpException("All order items must have status paid", 400);
  }
  // Verify no item is already assigned to a shipment
  const alreadyShipped = orderItems.find((item) => item.shipmentItem !== null);
  if (alreadyShipped) {
    throw new HttpException(
      "One or more order items are already assigned to a shipment",
      400,
    );
  }
  // Use collector to build CreateInput
  const shipmentData = await EcommerceMallShipmentCollector.collect({
    body: props.body,
    ecommerceMallSellers: { id: props.seller.id },
  });
  // Create shipment in transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment record
    const shipment = await tx.ecommerce_mall_shipments.create({
      data: shipmentData,
      ...EcommerceMallShipmentTransformer.select(),
    });
    // Update order items status to 'shipped'
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return shipment;
  });
  return await EcommerceMallShipmentTransformer.transform(created);
}
