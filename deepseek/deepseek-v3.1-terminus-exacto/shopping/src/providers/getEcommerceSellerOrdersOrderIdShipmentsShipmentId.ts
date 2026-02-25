import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceShipment> {
  // Verify shipment exists and belongs to seller
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
    where: {
      id: props.shipmentId,
      seller: { id: props.seller.id },
    },
    ...EcommerceShipmentTransformer.select(),
  });
  // Verify shipment items belong to specified order
  // Using correct Prisma relation property name based on schema inference
  const shipmentItems = await MyGlobal.prisma.ecommerce_shipment_items.findMany(
    {
      where: {
        ecommerce_shipment_id: props.shipmentId,
        orderItem: {
          order_id: props.orderId,
        },
      },
    },
  );
  if (shipmentItems.length === 0) {
    throw new HttpException("Shipment not found for this order", 404);
  }
  return await EcommerceShipmentTransformer.transform(shipment);
}
