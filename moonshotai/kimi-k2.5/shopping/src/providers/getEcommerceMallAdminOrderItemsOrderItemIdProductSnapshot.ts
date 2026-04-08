import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrderItemsOrderItemIdProductSnapshot(props: {
  admin: AdminPayload;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
        where: { order_item_id: props.orderItemId },
      },
    );
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    record,
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
// import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminOrderItemsOrderItemIdProductSnapshot(props: {
//   admin: AdminPayload;
//   orderItemId: string;
// }): Promise<IEcommerceMallOrderItemProductSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------