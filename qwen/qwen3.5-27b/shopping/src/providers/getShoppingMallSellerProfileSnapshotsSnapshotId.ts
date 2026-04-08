import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Fetch the snapshot - override select to include shopping_mall_seller_id in sellerProfile
  const select = ShoppingMallSellerProfileSnapshotTransformer.select();
  const record =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        ...select,
        select: {
          ...select.select,
          sellerProfile: {
            select: {
              id: true,
              shopping_mall_seller_id: true,
            },
          },
        },
        where: {
          id: props.snapshotId,
        },
      },
    );
  // Verify authorization: seller must own the profile
  if (record.sellerProfile.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to DTO using transformer
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