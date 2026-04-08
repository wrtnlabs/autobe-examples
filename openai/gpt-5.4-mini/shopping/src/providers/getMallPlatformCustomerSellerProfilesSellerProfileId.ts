import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function getMallPlatformCustomerSellerProfilesSellerProfileId(props: {
  customer: CustomerPayload;
  sellerProfileId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfile> {
  const record =
    await MyGlobal.prisma.mall_platform_seller_profiles.findFirstOrThrow({
      where: {
        id: props.sellerProfileId,
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerSellerProfilesSellerProfileId(props: {
//   customer: CustomerPayload;
//   sellerProfileId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformSellerProfile> {
//   const record = await MyGlobal.prisma.mall_platform_seller_profiles.findFirstOrThrow({
//     ...MallPlatformSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------