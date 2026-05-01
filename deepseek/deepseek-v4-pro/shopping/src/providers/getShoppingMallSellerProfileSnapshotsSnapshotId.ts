import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerProfileSnapshotTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirst({
      where: { shopping_mall_seller_id: props.seller.id },
      select: { id: true },
    });
  if (sellerProfile === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        where: { id: props.snapshotId },
        select: { shopping_mall_seller_profile_id: true },
      },
    );
  if (snapshot.shopping_mall_seller_profile_id !== sellerProfile.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallSellerProfileSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallSellerProfileSnapshotTransformer.transform(record);
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
// import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerProfileSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallSellerProfileSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow({
//     ...ShoppingMallSellerProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------