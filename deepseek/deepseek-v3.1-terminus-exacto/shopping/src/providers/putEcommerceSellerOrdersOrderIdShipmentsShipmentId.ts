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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putEcommerceSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IUpdate;
}): Promise<IEcommerceShipment> {
  // Find the shipment by shipmentId and verify seller ownership
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findFirst({
    where: {
      id: props.shipmentId,
      ecommerce_seller_id: props.seller.id,
    },
  });
  // Check if shipment exists and belongs to the seller
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Update the shipment with only allowed fields from IUpdate
  const updateData: Prisma.ecommerce_shipmentsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.shipment_status !== undefined) {
    updateData.shipment_status = props.body.shipment_status;
  }
  if (props.body.tracking_number !== undefined) {
    updateData.tracking_number = props.body.tracking_number;
  }
  if (props.body.carrier_name !== undefined) {
    updateData.carrier_name = props.body.carrier_name;
  }
  if (props.body.shipping_cost !== undefined) {
    updateData.shipping_cost = props.body.shipping_cost;
  }
  const updated = await MyGlobal.prisma.ecommerce_shipments.update({
    where: { id: props.shipmentId },
    data: updateData,
    ...EcommerceShipmentTransformer.select(),
  });
  // Transform and return the updated shipment
  return await EcommerceShipmentTransformer.transform(updated);
}
