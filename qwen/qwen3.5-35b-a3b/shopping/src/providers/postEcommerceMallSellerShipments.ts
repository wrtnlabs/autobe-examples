import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Validate carrier_name is provided
  if (
    props.body.carrier_name === null ||
    props.body.carrier_name === undefined
  ) {
    throw new HttpException("carrier_name is required", 400);
  }
  // Validate order_item_ids has at least one item
  if (props.body.order_item_ids.length < 1) {
    throw new HttpException("At least one order item is required", 400);
  }
  // Query all order items and verify they belong to the seller
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: {
        in: props.body.order_item_ids,
      },
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      seller_snapshot_id: true,
    },
  });
  // Verify all requested items were found
  if (orderItems.length !== props.body.order_item_ids.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Verify all order items belong to the authenticated seller
  for (const orderItem of orderItems) {
    if (orderItem.seller_snapshot_id !== props.seller.id) {
      throw new HttpException(
        "Order item does not belong to the authenticated seller",
        400,
      );
    }
  }
  // Create shipment record
  const created = await MyGlobal.prisma.ecommerce_mall_shipments.create({
    data: {
      id: v4(),
      carrier_name: props.body.carrier_name,
      carrier_phone: props.body.carrier_phone ?? null,
      carrier_website: props.body.carrier_website ?? null,
      status: "pending",
      shipped_at: null,
      delivered_at: null,
      estimated_delivery_at: null,
      delivery_address: props.body.delivery_address ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: {
        connect: { id: orderItems[0].ecommerce_mall_order_id },
      },
      seller: {
        connect: { id: props.seller.id },
      },
      orderItems: {
        connect: props.body.order_item_ids.map((itemId) => ({ id: itemId })),
      },
    },
    ...EcommerceMallShipmentTransformer.select(),
  });
  // Transform and return the created shipment
  return await EcommerceMallShipmentTransformer.transform(created);
}
