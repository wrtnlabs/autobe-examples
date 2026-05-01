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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerProfileSnapshotTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProfilesProfileIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_seller_profile_id: props.profileId,
        },
        ...ShoppingMallSellerProfileSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallSellerProfileSnapshotTransformer.transform(snapshot);
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
// export async function getShoppingMallAdminProfilesProfileIdSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
//   profileId: string & tags.Format<"uuid">;
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