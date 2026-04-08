import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrdersOrderIdShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      order: {
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
        },
      },
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment does not belong to this order", 400);
  }
  if (shipment.order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: {
        ecommerce_mall_shipment_id: props.shipmentId,
      },
      select: {
        ecommerce_mall_order_item_id: true,
      },
    });
  const orderItemIds = shipmentItems.map(
    (item) => item.ecommerce_mall_order_item_id,
  );
  if (orderItemIds.length > 0) {
    await MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
      },
      data: {
        status: "delivered",
      },
    });
  }
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
      ...EcommerceMallShipmentTransformer.select(),
      where: {
        id: props.shipmentId,
      },
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerOrdersOrderIdShipmentsShipmentIdConfirmDelivery(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
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