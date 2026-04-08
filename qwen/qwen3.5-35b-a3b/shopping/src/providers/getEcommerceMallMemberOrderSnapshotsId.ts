import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallOrderItemSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberOrderSnapshotsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.id,
        },
        ...EcommerceMallOrderItemSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemSnapshotTransformer.transform(record);
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
// import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberOrderSnapshotsId(props: {
//   member: MemberPayload;
//   id: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallOrderItemSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderItemSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------