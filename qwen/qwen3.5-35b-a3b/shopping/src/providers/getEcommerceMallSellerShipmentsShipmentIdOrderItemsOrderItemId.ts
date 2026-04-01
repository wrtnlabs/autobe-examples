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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { EcommerceMallShipmentsOrderItemTransformer } from "../transformers/EcommerceMallShipmentsOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShipmentsShipmentIdOrderItemsOrderItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentsOrderItem> {
  const junction =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findUniqueOrThrow(
      {
        where: {
          ecommerce_mall_shipment_id_ecommerce_mall_order_item_id: {
            ecommerce_mall_shipment_id: props.shipmentId,
            ecommerce_mall_order_item_id: props.orderItemId,
          },
        },
        select: {
          ...EcommerceMallShipmentsOrderItemTransformer.select().select,
          shipment: {
            ...EcommerceMallShipmentAtSummaryTransformer.select().select,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    );
  if (junction.shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallShipmentsOrderItemTransformer.transform(junction);
}
