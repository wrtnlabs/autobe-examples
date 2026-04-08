import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminShipmentsShipmentIdDelivery(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentDelivery> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findFirstOrThrow({
      ...EcommerceMallShipmentDeliveryTransformer.select(),
      where: {
        shipment_id: props.shipmentId,
      },
    });
  return await EcommerceMallShipmentDeliveryTransformer.transform(record);
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
// import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminShipmentsShipmentIdDelivery(props: {
//   admin: AdminPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipmentDelivery> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findFirstOrThrow({
//     ...EcommerceMallShipmentDeliveryTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentDeliveryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------