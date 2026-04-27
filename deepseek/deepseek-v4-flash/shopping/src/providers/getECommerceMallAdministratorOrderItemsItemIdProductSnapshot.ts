import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallOrderItemSnapshotTransformer } from "../transformers/ECommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallAdministratorOrderItemsItemIdProductSnapshot(props: {
  administrator: AdministratorPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallOrderItemSnapshot> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_order_item_snapshots.findFirstOrThrow(
      {
        where: { e_commerce_mall_order_item_id: props.itemId },
        ...ECommerceMallOrderItemSnapshotTransformer.select(),
      },
    );
  return await ECommerceMallOrderItemSnapshotTransformer.transform(record);
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
// import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallAdministratorOrderItemsItemIdProductSnapshot(props: {
//   administrator: AdministratorPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallOrderItemSnapshot> {
//   const record = await MyGlobal.prisma.e_commerce_mall_order_item_snapshots.findFirstOrThrow({
//     ...ECommerceMallOrderItemSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallOrderItemSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------