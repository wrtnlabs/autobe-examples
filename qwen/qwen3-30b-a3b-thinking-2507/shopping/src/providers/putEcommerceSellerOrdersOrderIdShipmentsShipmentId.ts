import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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

export async function putEcommerceSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IUpdate;
}): Promise<IEcommerceShipment> {
  const { body: updateBody, seller, orderId, shipmentId } = props;
  // Verify shipment exists for the specified order
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findFirst({
    where: {
      id: shipmentId,
      ecommerce_order_id: orderId,
    },
    select: {
      id: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found for the specified order", 404);
  }
  // Validate carrier_name is one of the allowed values
  if (
    updateBody.carrier_name &&
    !["FedEx", "UPS", "USPS"].includes(updateBody.carrier_name)
  ) {
    throw new HttpException(
      "Invalid carrier. Must be one of: FedEx, UPS, USPS",
      400,
    );
  }
  // Validate tracking_number minimum length
  if (updateBody.tracking_number && updateBody.tracking_number.length < 10) {
    throw new HttpException(
      "Tracking number must be at least 10 characters long",
      400,
    );
  }
  // Prepare update data
  const updateData: Partial<IEcommerceShipment.IUpdate> = {};
  if (updateBody.carrier_name !== undefined) {
    updateData.carrier_name = updateBody.carrier_name;
  }
  if (updateBody.tracking_number !== undefined) {
    updateData.tracking_number = updateBody.tracking_number;
  }
  if (updateBody.status !== undefined) {
    updateData.status = updateBody.status;
  }
  if (updateBody.shipment_date !== undefined) {
    updateData.shipment_date = toISOStringSafe(updateBody.shipment_date);
  }
  if (updateBody.expected_delivery_date !== undefined) {
    updateData.expected_delivery_date = toISOStringSafe(
      updateBody.expected_delivery_date,
    );
  }
  // Update the shipment
  await MyGlobal.prisma.ecommerce_shipments.update({
    where: { id: shipmentId },
    data: updateData,
  });
  // Re-query with proper select for transformer
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
      where: { id: shipmentId },
      ...EcommerceShipmentTransformer.select(),
    });
  // Transform the result for the response
  return await EcommerceShipmentTransformer.transform(updatedShipment);
}
