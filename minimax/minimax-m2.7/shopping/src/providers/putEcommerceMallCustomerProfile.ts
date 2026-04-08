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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSellerProfileTransformer } from "../transformers/EcommerceMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSellerProfile.IUpdate;
}): Promise<IEcommerceMallSellerProfile> {
  // 1. Fetch current seller profile
  const profile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
      where: {
        seller_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (profile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  // 2. Create snapshot of current state before updating
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
  // 3. Build update data object with only provided fields
  const dataUpdate: {
    updated_at: Date;
    name?: string;
    description?: string;
    logo_uri?: string | null;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    dataUpdate.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    dataUpdate.description = props.body.description;
  }
  if (props.body.logoUri !== undefined) {
    dataUpdate.logo_uri = props.body.logoUri;
  }
  // 4. Apply updates to profile
  await MyGlobal.prisma.ecommerce_mall_seller_profiles.update({
    where: { id: profile.id },
    data: dataUpdate,
  });
  // 5. Fetch and return updated profile using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findUniqueOrThrow({
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
// export async function putEcommerceMallCustomerProfile(props: {
//   customer: CustomerPayload;
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