import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSellerProfileTransformer } from "../transformers/EcommercePlatformSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformAdminSellersSellerIdProfilesProfileId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformSellerProfile> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirstOrThrow({
      ...EcommercePlatformSellerProfileTransformer.select(),
      where: {
        id: props.profileId,
        seller_id: props.sellerId,
        deleted_at: null,
      },
    });
  return await EcommercePlatformSellerProfileTransformer.transform(record);
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
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformAdminSellersSellerIdProfilesProfileId(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   profileId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformSellerProfile> {
//   const record = await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirstOrThrow({
//     ...EcommercePlatformSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------