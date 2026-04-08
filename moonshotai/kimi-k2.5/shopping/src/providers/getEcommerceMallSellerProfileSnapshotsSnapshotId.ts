import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerProfileSnapshotTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerProfileSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallSellerProfileSnapshotTransformer.select(),
      },
    );
  // Authorization check: seller must own the snapshot or be an admin
  if (record.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerProfileSnapshotTransformer.transform(record);
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
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProfileSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerProfileSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirstOrThrow({
//     ...EcommerceMallSellerProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------