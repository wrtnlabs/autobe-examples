import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallOrderSnapshotTransformer } from "../transformers/EcommerceMallOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminOrdersOrderIdSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  orderId: string;
  snapshotId: string;
}): Promise<IEcommerceMallOrderSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findFirstOrThrow({
      ...EcommerceMallOrderSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        order_id: props.orderId,
      },
    });
  return await EcommerceMallOrderSnapshotTransformer.transform(record);
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
// import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminOrdersOrderIdSnapshotsSnapshotId(props: {
//   superAdmin: SuperadminPayload;
//   orderId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallOrderSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------