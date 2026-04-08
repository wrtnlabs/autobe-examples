import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallOrderSnapshotTransformer } from "../transformers/EcommerceMallOrderSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorOrdersOrderIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findFirstOrThrow({
      ...EcommerceMallOrderSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        ecommerce_mall_order_id: props.orderId,
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorOrdersOrderIdSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallOrderSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------