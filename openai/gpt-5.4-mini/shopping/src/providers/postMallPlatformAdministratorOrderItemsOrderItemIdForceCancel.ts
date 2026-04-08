import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformOrderItemTransformer } from "../transformers/MallPlatformOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorOrderItemsOrderItemIdForceCancel(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItem.ICreate;
}): Promise<IMallPlatformOrderItem> {
  void props.administrator;
  void props.body;
  const current =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (current.deleted_at !== null) {
    throw new HttpException(
      "Order item is not eligible for force cancellation.",
      400,
    );
  }
  if (current.status === "cancelled" || current.status === "refunded") {
    throw new HttpException(
      "Order item is not eligible for force cancellation.",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_order_items.update({
      where: { id: props.orderItemId },
      data: {
        status: "cancelled",
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...MallPlatformOrderItemTransformer.select(),
    });
  return await MallPlatformOrderItemTransformer.transform(updated);
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
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAdministratorOrderItemsOrderItemIdForceCancel(props: {
//   administrator: AdministratorPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrderItem.ICreate;
// }): Promise<IMallPlatformOrderItem> {
//   const record = await MyGlobal.prisma.mall_platform_order_items.create({
//     data: await MallPlatformOrderItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformOrderItemTransformer.select(),
//   });
//   return await MallPlatformOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------