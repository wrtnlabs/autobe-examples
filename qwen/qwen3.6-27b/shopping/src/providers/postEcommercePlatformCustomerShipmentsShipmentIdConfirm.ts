import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformShipmentTransformer } from "../transformers/EcommercePlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerShipmentsShipmentIdConfirm(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommercePlatformShipment.IConfirm;
}): Promise<IEcommercePlatformShipment> {
  const shipment =
    await MyGlobal.prisma.ecommerce_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        confirmed_at: true,
      },
    });
  if (shipment.confirmed_at !== null) {
    throw new HttpException("Delivery has already been confirmed", 409);
  }
  const totalItems =
    await MyGlobal.prisma.ecommerce_platform_shipment_items.count({
      where: { ecommerce_platform_shipment_id: props.shipmentId },
    });
  if (totalItems === 0) {
    throw new HttpException("Shipment has no order items", 400);
  }
  const customerItems =
    await MyGlobal.prisma.ecommerce_platform_shipment_items.count({
      where: {
        ecommerce_platform_shipment_id: props.shipmentId,
        orderItem: {
          order: {
            ecommerce_platform_customer_profile_id: props.customer.id,
          },
        },
      },
    });
  if (customerItems !== totalItems) {
    throw new HttpException(
      "You can only confirm shipments for your own orders",
      403,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.ecommerce_platform_shipments.update({
    where: { id: props.shipmentId },
    data: {
      confirmed_at: now,
      delivered_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.ecommerce_platform_order_items.updateMany({
    where: {
      shipmentItem: {
        ecommerce_platform_shipment_id: props.shipmentId,
      },
    },
    data: {
      status: "delivered",
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommercePlatformShipmentTransformer.select(),
    });
  return await EcommercePlatformShipmentTransformer.transform(updated);
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
// import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerShipmentsShipmentIdConfirm(props: {
//   customer: CustomerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformShipment.IConfirm;
// }): Promise<IEcommercePlatformShipment> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shipments.findFirstOrThrow({
//     ...EcommercePlatformShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------