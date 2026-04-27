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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallSellerProfileSnapshotTransformer } from "../transformers/ECommerceMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallAdministratorSellersSellerIdProfileSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSellerProfileSnapshot> {
  // Validate seller exists and is not deleted
  await MyGlobal.prisma.e_commerce_mall_sellers.findFirstOrThrow({
    where: { id: props.sellerId, deleted_at: null },
    select: { id: true },
  });
  // Get seller's profile (1:1 relation, unique on e_commerce_mall_seller_id)
  const profile =
    await MyGlobal.prisma.e_commerce_mall_seller_profiles.findUniqueOrThrow({
      where: { e_commerce_mall_seller_id: props.sellerId },
      select: { id: true },
    });
  // Find the snapshot scoped to this seller's profile
  const record =
    await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          e_commerce_mall_seller_profile_id: profile.id,
        },
        ...ECommerceMallSellerProfileSnapshotTransformer.select(),
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
// export async function getECommerceMallAdministratorSellersSellerIdProfileSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
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