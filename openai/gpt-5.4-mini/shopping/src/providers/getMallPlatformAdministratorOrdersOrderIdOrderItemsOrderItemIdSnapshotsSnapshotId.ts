import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
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
import { MallPlatformOrderItemSnapshotTransformer } from "../transformers/MallPlatformOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorOrdersOrderIdOrderItemsOrderItemIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformOrderItemSnapshot> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: { id: true },
    });
    const orderItem = await prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        mall_platform_order_id: true,
      },
    });
    if (orderItem.mall_platform_order_id !== props.orderId) {
      throw new HttpException("Not Found", 404);
    }
    return await prisma.mall_platform_order_item_snapshots.findFirstOrThrow({
      ...MallPlatformOrderItemSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        mall_platform_order_item_id: props.orderItemId,
      },
    });
  });
  return await MallPlatformOrderItemSnapshotTransformer.transform(record);
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
// import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformAdministratorOrdersOrderIdOrderItemsOrderItemIdSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
//   orderItemId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformOrderItemSnapshot> {
//   const record = await MyGlobal.prisma.mall_platform_order_item_snapshots.findFirstOrThrow({
//     ...MallPlatformOrderItemSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformOrderItemSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------