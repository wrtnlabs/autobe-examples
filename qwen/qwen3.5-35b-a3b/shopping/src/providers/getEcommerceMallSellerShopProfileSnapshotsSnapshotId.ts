import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShopProfileSnapshotTransformer } from "../transformers/EcommerceMallShopProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerShopProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShopProfileSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallShopProfileSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
        },
      },
    );
  const shopProfile =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findUniqueOrThrow({
      where: { id: record.shopProfile.id },
      select: { seller_id: true },
    });
  if (shopProfile.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallShopProfileSnapshotTransformer.transform(record);
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
// import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
// import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerShopProfileSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShopProfileSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.findFirstOrThrow({
//     ...EcommerceMallShopProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShopProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------