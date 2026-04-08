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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Validate all order items belong to seller and have 'paid' status
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      status: true,
      order_id: true,
    },
  });
  // Check all order items exist
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Verify all items belong to authenticated seller
  const unauthorizedItems = orderItems.filter(
    (item) => item.seller_id !== props.seller.id,
  );
  if (unauthorizedItems.length > 0) {
    throw new HttpException(
      "One or more order items do not belong to authenticated seller",
      403,
    );
  }
  // Verify all items have 'paid' status
  const invalidStatusItems = orderItems.filter(
    (item) => item.status !== "paid",
  );
  if (invalidStatusItems.length > 0) {
    throw new HttpException(
      "One or more order items are not in 'paid' status",
      400,
    );
  }
  // Verify all items belong to same order
  const uniqueOrderIds = [...new Set(orderItems.map((item) => item.order_id))];
  if (uniqueOrderIds.length > 1) {
    throw new HttpException("Order items must belong to the same order", 400);
  }
  // Execute transaction: create shipment and update order items
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create shipment with collector
    const shipment = await prisma.ecommerce_mall_shipments.create({
      data: await EcommerceMallShipmentCollector.collect({
        body: props.body,
        seller: props.seller,
      }),
      ...EcommerceMallShipmentTransformer.select(),
    });
    // Update all order items to 'shipped' status
    await prisma.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return shipment;
  });
  return EcommerceMallShipmentTransformer.transform(created);
}
