import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSellerProfileSnapshotTransformer } from "../transformers/ECommerceMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSuperAdministratorSellersSellerIdProfileSnapshotsSnapshotId(props: {
  superAdministrator: SuperadministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSellerProfileSnapshot> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        ...ECommerceMallSellerProfileSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          sellerProfile: {
            seller: {
              id: props.sellerId,
              deleted_at: null,
            },
          },
        },
      },
    );
  return await ECommerceMallSellerProfileSnapshotTransformer.transform(record);
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
// import { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSuperAdministratorSellersSellerIdProfileSnapshotsSnapshotId(props: {
//   superAdministrator: SuperadministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallSellerProfileSnapshot> {
//   const record = await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.findFirstOrThrow({
//     ...ECommerceMallSellerProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------