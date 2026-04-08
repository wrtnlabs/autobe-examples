import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentAtInvertTransformer } from "../transformers/MallPlatformShipmentAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerShipmentsShipmentIdTracking(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShipment.IInvert> {
  const ownership =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      select: {
        mall_platform_seller_id: true,
      },
    });
  if (ownership.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      ...MallPlatformShipmentAtInvertTransformer.select(),
    });
  return await MallPlatformShipmentAtInvertTransformer.transform(shipment);
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
// import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerShipmentsShipmentIdTracking(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformShipment.IInvert> {
//   const record = await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
//     ...MallPlatformShipmentAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformShipmentAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------