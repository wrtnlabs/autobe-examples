import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformSnapshotSellerProfileTransformer } from "../transformers/EcommercePlatformSnapshotSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformSnapshotSellerProfile> {
  const ownershipCheck =
    await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findFirstOrThrow(
      {
        where: {
          ecommercePlatformSnapshots: { id: props.snapshotId },
        },
        select: {
          ecommercePlatformSnapshots: {
            select: { entity_type: true },
          },
          ecommerce_platform_seller_profiles_id: true,
        },
      },
    );
  if (
    ownershipCheck.ecommercePlatformSnapshots.entity_type !== "seller_profile"
  ) {
    throw new HttpException("Not Found", 404);
  }
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirst({
      where: {
        id: ownershipCheck.ecommerce_platform_seller_profiles_id,
        seller: { id: props.seller.id },
      },
      select: { id: true },
    });
  if (sellerProfile === null) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findFirstOrThrow(
      {
        where: {
          ecommercePlatformSnapshots: { id: props.snapshotId },
        },
        ...EcommercePlatformSnapshotSellerProfileTransformer.select(),
      },
    );
  return await EcommercePlatformSnapshotSellerProfileTransformer.transform(
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
// import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformSellerProfileSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformSnapshotSellerProfile> {
//   const record = await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findFirstOrThrow({
//     ...EcommercePlatformSnapshotSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformSnapshotSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------