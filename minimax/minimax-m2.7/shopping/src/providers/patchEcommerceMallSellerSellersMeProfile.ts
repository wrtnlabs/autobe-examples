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

export async function patchEcommerceMallSellerSellersMeProfile(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfile.IUpdate;
}): Promise<IEcommerceMallSellerProfile> {
  // Step 1: Query existing seller profile by seller_id
  const profile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      ...EcommerceMallSellerProfileTransformer.select(),
    });
  // Step 2: Create snapshot BEFORE applying changes (non-blocking per spec)
  try {
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_seller_profile_id: profile.id,
        shop_name: profile.name,
        shop_description: profile.description,
        logo_url: profile.logo_uri,
        created_at: new Date(),
      },
    });
  } catch (error) {
    // Log error but continue with profile update (snapshot is for audit, not blocking)
    console.error("Failed to create seller profile snapshot:", error);
  }
  // Step 3: Build update data with only provided fields
  const updateData: {
    name?: string;
    description?: string;
    logo_uri?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.logoUri !== undefined) {
    updateData.logo_uri = props.body.logoUri;
  }
  // Step 4: Apply update
  await MyGlobal.prisma.ecommerce_mall_seller_profiles.update({
    where: { id: profile.id },
    data: updateData,
  });
  // Step 5: Fetch and return updated profile
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
      where: { id: profile.id },
      ...EcommerceMallSellerProfileTransformer.select(),
    });
  return await EcommerceMallSellerProfileTransformer.transform(updated);
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
// export async function patchEcommerceMallSellerSellersMeProfile(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerProfile.IUpdate;
// }): Promise<IEcommerceMallSellerProfile> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
//     ...EcommerceMallSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------