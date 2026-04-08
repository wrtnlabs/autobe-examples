import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformSellerProfileSnapshotTransformer } from "../transformers/MallPlatformSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerSellersSellerIdProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfileSnapshot> {
  if (props.seller.type !== "seller") {
    throw new HttpException("Forbidden", 403);
  }
  if (props.seller.id !== props.sellerId) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          sellerProfile: {
            seller_account_id: props.sellerId,
          },
        },
        ...MallPlatformSellerProfileSnapshotTransformer.select(),
      },
    );
  return await MallPlatformSellerProfileSnapshotTransformer.transform(record);
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
// import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
// import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerSellersSellerIdProfileSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   sellerId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformSellerProfileSnapshot> {
//   const record = await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findFirstOrThrow({
//     ...MallPlatformSellerProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformSellerProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------