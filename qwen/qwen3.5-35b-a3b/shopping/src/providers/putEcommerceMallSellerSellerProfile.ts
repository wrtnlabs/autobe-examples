import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShopProfileTransformer } from "../transformers/EcommerceMallShopProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerSellerProfile(props: {
  seller: SellerPayload;
  body: IEcommerceMallShopProfile.IUpdate;
}): Promise<IEcommerceMallShopProfile> {
  // Validate at least one field is provided
  if (
    props.body.shop_name === undefined &&
    props.body.shop_description === undefined &&
    props.body.logo_url === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  // Verify seller exists, is not deleted, and is approved
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
    where: {
      id: props.seller.id,
      deleted_at: null,
      approval_status: "approved",
    },
  });
  // Find shop profile by seller_id
  const existingProfile =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
      },
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (existingProfile === null) {
    throw new HttpException("Shop profile not found", 404);
  }
  if (existingProfile.deleted_at !== null) {
    throw new HttpException("Shop profile is deleted", 410);
  }
  // Create snapshot BEFORE update
  const currentTime = new Date();
  await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_shop_profile_id: existingProfile.id,
      shop_name: existingProfile.shop_name,
      shop_description: existingProfile.shop_description ?? "",
      logo_url: existingProfile.logo_url ?? "",
      created_at: currentTime,
    },
  });
  // Update profile with provided fields only
  const updateData: {
    shop_name?: string;
    shop_description?: string | null;
    logo_url?: (string & tags.Format<"uri">) | null;
    updated_at: Date;
  } = {
    updated_at: currentTime,
  };
  if (props.body.shop_name !== undefined) {
    updateData.shop_name = props.body.shop_name;
  }
  if (props.body.shop_description !== undefined) {
    updateData.shop_description = props.body.shop_description;
  }
  if (props.body.logo_url !== undefined) {
    updateData.logo_url = props.body.logo_url;
  }
  const updatedProfile =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.update({
      where: {
        id: existingProfile.id,
      },
      data: updateData,
      ...EcommerceMallShopProfileTransformer.select(),
    });
  return await EcommerceMallShopProfileTransformer.transform(updatedProfile);
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
// import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerSellerProfile(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallShopProfile.IUpdate;
// }): Promise<IEcommerceMallShopProfile> {
//   await MyGlobal.prisma.ecommerce_mall_shop_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_shop_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallShopProfileTransformer.select(),
//   });
//   return await EcommerceMallShopProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------