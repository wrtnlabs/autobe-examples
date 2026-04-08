import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallShipmentItemTransformer } from "../transformers/EcommerceMallShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentId(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  // Fetch shipment with necessary relations for authorization and response
  const shipmentRecord =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId, deleted_at: null },
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        shipped_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        order: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
              },
            },
          },
        },
        shipment_items: EcommerceMallShipmentItemTransformer.select(),
        shipment_deliveries: {
          select: {
            id: true,
          },
        },
      },
    });
  // Authorization check: customer must own the order
  if (shipmentRecord.order.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Derive status based on delivery confirmation
  // Status is 'delivered' if delivery record exists OR shipped_at + 14 days has passed
  const hasDelivery = shipmentRecord.shipment_deliveries.length > 0;
  const shippedAtTime = shipmentRecord.shipped_at.getTime();
  const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
  const currentTime = Date.now();
  const isDelivered =
    hasDelivery || shippedAtTime + fourteenDaysInMs <= currentTime;
  const status: IEcommerceMallShipment["status"] = isDelivered
    ? "delivered"
    : "in_transit";
  // Transform related entities
  const seller = await EcommerceMallSellerAtSummaryTransformer.transform(
    shipmentRecord.seller,
  );
  const shipmentItems = await ArrayUtil.asyncMap(
    shipmentRecord.shipment_items,
    EcommerceMallShipmentItemTransformer.transform,
  );
  return {
    id: shipmentRecord.id as string & tags.Format<"uuid">,
    carrier_name: shipmentRecord.carrier_name,
    tracking_number: shipmentRecord.tracking_number,
    shipped_at: shipmentRecord.shipped_at.toISOString() as string &
      tags.Format<"date-time">,
    status: status,
    created_at: shipmentRecord.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: shipmentRecord.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (shipmentRecord.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null) ?? null,
    seller: seller,
    shipment_items: shipmentItems,
  } satisfies IEcommerceMallShipment;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerShipmentsShipmentId(props: {
//   customer: CustomerPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipment> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------