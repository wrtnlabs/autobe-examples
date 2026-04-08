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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShipment> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
      ...MallPlatformShipmentTransformer.select(),
      where: {
        id: props.shipmentId,
        deleted_at: null,
        order: {
          customer: {
            id: props.customer.id,
          },
        },
      },
    });
  if (shipment.status === "delivered") {
    throw new HttpException(
      "Shipment is not eligible for delivery confirmation",
      409,
    );
  }
  const deliveredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipments.update({
      where: {
        id: props.shipmentId,
      },
      data: {
        status: "delivered",
        delivered_at: deliveredAt,
        updated_at: deliveredAt,
      },
    });
  });
  const refreshed =
    await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
      ...MallPlatformShipmentTransformer.select(),
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
    });
  return await MallPlatformShipmentTransformer.transform(refreshed);
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
// export async function postMallPlatformCustomerShipmentsShipmentIdConfirmDelivery(props: {
//   customer: CustomerPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformShipment> {
//   const record = await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
//     ...MallPlatformShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------