import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCustomerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
        },
        select: {
          id: true,
          seller_profile_id: true,
          shop_name: true,
          shop_description: true,
          logo_image_uri: true,
          created_at: true,
        },
      },
    );
  if (snapshot.seller_profile_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    customer: {
      id: snapshot.seller_profile_id,
      email: "",
      status: "",
      created_at: "",
      updated_at: "",
      deleted_at: null,
    },
    displayName: snapshot.shop_name,
    phone: snapshot.shop_description,
    changedAt: toISOStringSafe(snapshot.created_at),
    createdAt: toISOStringSafe(snapshot.created_at),
  };
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
// import { IMallPlatformCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfileSnapshot";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerProfileSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformCustomerProfileSnapshot> {
//   return {
//     id: ...,
//     customer: await MallPlatformCustomerAtSummaryTransformer.transform(...),
//     displayName: ...,
//     phone: ...,
//     changedAt: ...,
//     createdAt: ...,
//   };
// }
// ```
//--------------------------------------------------------------