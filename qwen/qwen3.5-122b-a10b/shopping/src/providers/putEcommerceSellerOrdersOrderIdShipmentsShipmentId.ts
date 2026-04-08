import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
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
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IUpdate;
}): Promise<IEcommerceShipment> {
  // Validate shipment exists, is not soft-deleted, and belongs to the specified order
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findFirst({
    where: {
      id: props.shipmentId,
      order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      status: true,
      delivered_at: true,
    },
  });
  if (shipment === null) {
    throw new HttpException(
      "Shipment not found or does not belong to the specified order",
      404,
    );
  }
  // Verify authenticated seller owns the shipment
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to update this shipment",
      403,
    );
  }
  // Check shipment is not already delivered (cannot update after delivery)
  if (shipment.status === "delivered") {
    throw new HttpException(
      "Cannot update tracking information for a delivered shipment",
      400,
    );
  }
  // Update tracking information
  await MyGlobal.prisma.ecommerce_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      tracking_url: props.body.tracking_url ?? null,
      updated_at: new Date(),
    },
  });
  // Fetch and transform updated shipment with all relations
  const updated = await MyGlobal.prisma.ecommerce_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
    ...EcommerceShipmentTransformer.select(),
  });
  return await EcommerceShipmentTransformer.transform(updated);
}
