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
import { MallPlatformSellerProfileSnapshotTransformer } from "../transformers/MallPlatformSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorSellerProfileSnapshotsSellerProfileSnapshotId(props: {
  administrator: AdministratorPayload;
  sellerProfileSnapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfileSnapshot> {
  const record =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: { id: props.sellerProfileSnapshotId },
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
// export async function getMallPlatformAdministratorSellerProfileSnapshotsSellerProfileSnapshotId(props: {
//   administrator: AdministratorPayload;
//   sellerProfileSnapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformSellerProfileSnapshot> {
//   const record = await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findFirstOrThrow({
//     ...MallPlatformSellerProfileSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformSellerProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------