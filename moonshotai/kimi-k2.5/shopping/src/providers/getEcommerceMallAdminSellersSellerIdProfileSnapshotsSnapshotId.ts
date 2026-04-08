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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerProfileSnapshotTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSellersSellerIdProfileSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  sellerId: string;
  snapshotId: string;
}): Promise<IEcommerceMallSellerProfileSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallSellerProfileSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          seller_id: props.sellerId,
        },
      },
    );
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
// export async function getEcommerceMallAdminSellersSellerIdProfileSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
//   sellerId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallSellerProfileSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirstOrThrow({
//     ...EcommerceMallSellerProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------