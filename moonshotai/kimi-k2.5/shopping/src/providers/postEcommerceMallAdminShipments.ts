import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Validate that all order items exist, belong to same seller, and have 'paid' status
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: {
        in: props.body.orderItemIds,
      },
    },
    select: {
      id: true,
      seller_id: true,
      status: true,
      order_id: true,
    },
  });
  // Verify all requested items exist
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Verify all items belong to the same seller
  const sellerId = orderItems[0].seller_id;
  const allSameSeller = orderItems.every((item) => item.seller_id === sellerId);
  if (!allSameSeller) {
    throw new HttpException(
      "All order items must belong to the same seller",
      400,
    );
  }
  // Verify all items have 'paid' status
  const allPaid = orderItems.every((item) => item.status === "paid");
  if (!allPaid) {
    throw new HttpException("All order items must have 'paid' status", 400);
  }
  // Use transaction to ensure atomicity
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment using collector
    const shipmentData = await EcommerceMallShipmentCollector.collect({
      body: props.body,
      seller: { id: sellerId },
    });
    const created = await tx.ecommerce_mall_shipments.create({
      data: shipmentData,
      ...EcommerceMallShipmentTransformer.select(),
    });
    // Update all order item statuses to 'shipped'
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: {
          in: props.body.orderItemIds,
        },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return created;
  });
  return await EcommerceMallShipmentTransformer.transform(shipment);
}
