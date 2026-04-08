import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallSellerProfile.IUpdate;
}): Promise<IShoppingMallSellerProfile> {
  const current =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: {
        shopping_mall_seller_id: props.customer.id,
      },
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_uri: true,
        is_banned: true,
        is_suspended: true,
      },
    });
  if (current.is_banned === true) {
    throw new HttpException("Seller account is banned", 403);
  }
  if (current.is_suspended === true) {
    throw new HttpException("Seller account is suspended", 403);
  }
  const shop_name_before = current.shop_name;
  const shop_description_before = current.shop_description;
  const logo_uri_before = current.logo_uri;
  const updateData: Prisma.shopping_mall_seller_profilesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.shop_name !== undefined) {
    updateData.shop_name = props.body.shop_name;
  }
  if (props.body.shop_description !== undefined) {
    updateData.shop_description = props.body.shop_description;
  }
  if (props.body.logo_uri !== undefined) {
    updateData.logo_uri = props.body.logo_uri;
  }
  await MyGlobal.prisma.shopping_mall_seller_profiles.update({
    where: {
      id: current.id,
    },
    data: updateData,
  });
  const snapshotData: Prisma.shopping_mall_seller_profile_snapshotsCreateInput =
    {
      id: v4(),
      sellerProfile: { connect: { id: current.id } },
      shop_name_before:
        props.body.shop_name !== undefined ? shop_name_before : null,
      shop_name_after:
        props.body.shop_name !== undefined ? props.body.shop_name : null,
      shop_description_before:
        props.body.shop_description !== undefined
          ? shop_description_before
          : null,
      shop_description_after:
        props.body.shop_description !== undefined
          ? props.body.shop_description
          : null,
      logo_image_before:
        props.body.logo_uri !== undefined ? logo_uri_before : null,
      logo_image_after:
        props.body.logo_uri !== undefined ? props.body.logo_uri : null,
      created_at: new Date(),
    };
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: snapshotData,
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: {
        id: current.id,
      },
      ...ShoppingMallSellerProfileTransformer.select(),
    });
  return await ShoppingMallSellerProfileTransformer.transform(updated);
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
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallCustomerProfile(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallSellerProfile.IUpdate;
// }): Promise<IShoppingMallSellerProfile> {
//   await MyGlobal.prisma.shopping_mall_seller_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallSellerProfileTransformer.select(),
//   });
//   return await ShoppingMallSellerProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------