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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformSellerProfileTransformer } from "../transformers/MallPlatformSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerStorefrontIdentity(props: {
  seller: SellerPayload;
  body: IMallPlatformSellerProfile.IUpdate;
}): Promise<IMallPlatformSellerProfile> {
  await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
    where: {
      seller_account_id: props.seller.id,
    },
    select: {
      id: true,
      seller_account_id: true,
      shop_name: true,
      shop_description: true,
      logo_image_uri: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  await MyGlobal.prisma.mall_platform_seller_profiles.update({
    where: {
      seller_account_id: props.seller.id,
    },
    data: {
      ...(props.body.shopName !== undefined
        ? { shop_name: props.body.shopName }
        : {}),
      ...(props.body.shopDescription !== undefined
        ? { shop_description: props.body.shopDescription }
        : {}),
      ...(props.body.logoImageUri !== undefined
        ? { logo_image_uri: props.body.logoImageUri }
        : {}),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
      where: {
        seller_account_id: props.seller.id,
      },
      ...MallPlatformSellerProfileTransformer.select(),
    });
  return await MallPlatformSellerProfileTransformer.transform(updated);
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
// export async function putMallPlatformSellerStorefrontIdentity(props: {
//   seller: SellerPayload;
//   body: IMallPlatformSellerProfile.IUpdate;
// }): Promise<IMallPlatformSellerProfile> {
//   await MyGlobal.prisma.mall_platform_seller_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformSellerProfileTransformer.select(),
//   });
//   return await MallPlatformSellerProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------