import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformSellerProfileTransformer } from "../transformers/MallPlatformSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerSellersSellerIdStorefrontIdentity(props: {
  customer: CustomerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfile> {
  const record =
    await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
      where: {
        seller_account_id: props.sellerId,
        deleted_at: null,
      },
      ...MallPlatformSellerProfileTransformer.select(),
    });
  return await MallPlatformSellerProfileTransformer.transform(record);
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
// import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerSellersSellerIdStorefrontIdentity(props: {
//   customer: CustomerPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformSellerProfile> {
//   const record = await MyGlobal.prisma.mall_platform_seller_profiles.findFirstOrThrow({
//     ...MallPlatformSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------