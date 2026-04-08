import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerProfileTransformer } from "../transformers/EcommerceMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerSellersMeProfile(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfile.IUpdate;
}): Promise<IEcommerceMallSellerProfile> {
  const currentProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
      },
    });
  await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.create({
    data: {
      id: v4(),
      sellerProfile: { connect: { id: currentProfile.id } },
      shop_name: currentProfile.name,
      shop_description: currentProfile.description,
      logo_url: currentProfile.logo_uri,
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.ecommerce_mall_seller_profiles.update({
    where: {
      id: currentProfile.id,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logoUri !== undefined && { logo_uri: props.body.logoUri }),
      updated_at: new Date(),
    },
  });
  const profileWithSeller =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findUniqueOrThrow({
      where: { id: currentProfile.id },
      ...EcommerceMallSellerProfileTransformer.select(),
    });
  return await EcommerceMallSellerProfileTransformer.transform(
    profileWithSeller,
  );
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerSellersMeProfile(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerProfile.IUpdate;
// }): Promise<IEcommerceMallSellerProfile> {
//   await MyGlobal.prisma.ecommerce_mall_seller_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_seller_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallSellerProfileTransformer.select(),
//   });
//   return await EcommerceMallSellerProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------