import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentsOrderItemTransformer } from "../transformers/EcommerceMallShipmentsOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentsOrderItem> {
  const shipmentsOrderItem =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findFirst({
      where: {
        ecommerce_mall_shipment_id: props.shipmentId,
        ecommerce_mall_order_item_id: props.orderItemId,
        deleted_at: null,
      },
      ...EcommerceMallShipmentsOrderItemTransformer.select(),
    });
  if (shipmentsOrderItem === null) {
    throw new HttpException("Not found", 404);
  }
  const order = shipmentsOrderItem.orderItem.order;
  if (order.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallShipmentsOrderItemTransformer.transform(
    shipmentsOrderItem,
  );
}
