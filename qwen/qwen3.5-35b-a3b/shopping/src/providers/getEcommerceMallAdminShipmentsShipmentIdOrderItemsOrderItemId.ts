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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminShipmentsShipmentIdOrderItemsOrderItemId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentsOrderItem> {
  const result =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findUniqueOrThrow(
      {
        where: {
          ecommerce_mall_shipment_id_ecommerce_mall_order_item_id: {
            ecommerce_mall_shipment_id: props.shipmentId,
            ecommerce_mall_order_item_id: props.orderItemId,
          },
        },
        select: {
          id: true,
          shipped_quantity: true,
          orderItem: {
            select: {
              id: true,
              unit_price: true,
              total_price: true,
              product_name: true,
              product_sku: true,
              variant_name: true,
            },
          },
          shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        },
      },
    );
  const shipmentData =
    await EcommerceMallShipmentAtSummaryTransformer.transform(result.shipment);
  const orderData = await EcommerceMallOrderAtSummaryTransformer.transform(
    result.shipment.order,
  );
  return {
    id: result.id,
    quantity: result.shipped_quantity,
    unit_price: result.orderItem.unit_price,
    total_price: result.orderItem.total_price,
    product_name: result.orderItem.product_name,
    product_sku: result.orderItem.product_sku,
    variant_name: result.orderItem.variant_name,
    shipment: shipmentData,
    order: orderData,
  } satisfies IEcommerceMallShipmentsOrderItem;
}
