import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceDeliveryConfirmationTransformer } from "../transformers/EcommerceDeliveryConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerShipmentsShipmentIdDeliveryConfirmationsConfirmationId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  confirmationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceDeliveryConfirmation> {
  // Verify the shipment belongs to the customer's order
  const shipmentExists = await MyGlobal.prisma.ecommerce_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shipmentItems: {
        some: {
          orderItem: {
            order: {
              customer: {
                id: props.customer.id,
              },
            },
          },
        },
      },
    },
    select: { id: true },
  });
  if (!shipmentExists) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Retrieve the specific delivery confirmation with validation
  const confirmation =
    await MyGlobal.prisma.ecommerce_delivery_confirmations.findUniqueOrThrow({
      where: {
        id: props.confirmationId,
        ecommerce_shipment_id: props.shipmentId,
      },
      ...EcommerceDeliveryConfirmationTransformer.select(),
    });
  return await EcommerceDeliveryConfirmationTransformer.transform(confirmation);
}
