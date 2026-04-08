import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentAtInvertTransformer } from "../transformers/EcommerceMallShipmentAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<IEcommerceMallShipment.IInvert> {
  // Find the shipment - throws 404 if not found
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Validate shipment belongs to the specified order
  if (shipment.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      400,
    );
  }
  // Verify seller owns this shipment
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the shipment with carrier and tracking number
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier: props.body.carrier,
      tracking_number: props.body.trackingNumber,
      updated_at: new Date(),
    },
  });
  // Fetch complete shipment with relations for transformer response
  const completeShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentAtInvertTransformer.select(),
    });
  return await EcommerceMallShipmentAtInvertTransformer.transform(
    completeShipment,
  );
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
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerOrdersOrderIdShipmentsShipmentId(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShipment.IUpdate;
// }): Promise<IEcommerceMallShipment.IInvert> {
//   await MyGlobal.prisma.ecommerce_mall_shipments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallShipmentAtInvertTransformer.select(),
//   });
//   return await EcommerceMallShipmentAtInvertTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------