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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorSellersSellerIdProfileSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfileSnapshot> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          seller_profile_id: props.sellerId,
        },
        select: {
          id: true,
          shop_name: true,
          shop_description: true,
          logo_image_uri: true,
          created_at: true,
        },
      },
    );
  return {
    id: record.id,
    sellerProfile: {} satisfies IMallPlatformSellerProfile.ISummary,
    shopName: record.shop_name,
    shopDescription: record.shop_description,
    logoImageUri: record.logo_image_uri,
    createdAt: record.created_at.toISOString(),
  } satisfies IMallPlatformSellerProfileSnapshot;
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
// export async function getMallPlatformAdministratorSellersSellerIdProfileSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
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