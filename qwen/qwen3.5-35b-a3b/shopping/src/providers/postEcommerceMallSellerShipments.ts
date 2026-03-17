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
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  const { seller, body } = props;
  // Validate carrier_name is provided
  if (body.carrier_name === null || body.carrier_name === undefined) {
    throw new HttpException("Carrier name is required", 400);
  }
  // Validate all order items exist and are not soft-deleted
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: body.order_item_ids },
      deleted_at: null,
    },
  });
  if (orderItems.length !== body.order_item_ids.length) {
    throw new HttpException("Some order items not found", 404);
  }
  // Verify all items belong to authenticated seller
  for (const item of orderItems) {
    if (item.seller_snapshot_id !== seller.id) {
      throw new HttpException("Order item does not belong to seller", 400);
    }
  }
  // Create shipment record using collector
  const firstOrderItem = orderItems[0];
  const createdShipment = await MyGlobal.prisma.ecommerce_mall_shipments.create(
    {
      data: await EcommerceMallShipmentCollector.collect({
        body,
        ecommerceMallSellers: { id: seller.id },
        ecommerceMallOrderItems: { id: firstOrderItem.id },
      }),
      ...EcommerceMallShipmentTransformer.select(),
    },
  );
  // Note: Status update removed - order_items table has no status field in DB schema
  // Fetch and transform result
  const result =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: createdShipment.id },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(result);
}
