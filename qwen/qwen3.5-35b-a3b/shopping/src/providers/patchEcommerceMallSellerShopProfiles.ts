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

export async function patchEcommerceMallSellerShopProfiles(props: {
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
  // Fetch current profile for this seller
  const currentProfile =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  if (currentProfile === null) {
    throw new HttpException("Shop profile not found", 404);
  }
  // Validate shop_name if provided
  if (props.body.shop_name !== undefined) {
    const shopName = props.body.shop_name;
    if (shopName.length < 1 || shopName.length > 100) {
      throw new HttpException("Shop name must be 1-100 characters", 400);
    }
    if (/^\s*$/.test(shopName)) {
      throw new HttpException(
        "Shop name cannot be empty or whitespace-only",
        400,
      );
    }
  }
  // Validate shop_description if provided
  if (props.body.shop_description !== undefined) {
    if (
      props.body.shop_description !== null &&
      props.body.shop_description.length > 5000
    ) {
      throw new HttpException(
        "Shop description must be at most 5000 characters",
        400,
      );
    }
  }
  // Validate logo_url if provided
  if (props.body.logo_url !== undefined) {
    if (props.body.logo_url !== null && props.body.logo_url.length > 80000) {
      throw new HttpException("Logo URL must be at most 80000 characters", 400);
    }
  }
  // Check shop_name uniqueness if being updated
  if (
    props.body.shop_name !== undefined &&
    props.body.shop_name !== currentProfile.shop_name
  ) {
    const existingProfile =
      await MyGlobal.prisma.ecommerce_mall_shop_profiles.findFirst({
        where: {
          shop_name: props.body.shop_name,
          seller_id: { not: props.seller.id },
          deleted_at: null,
        },
      });
    if (existingProfile !== null) {
      throw new HttpException("Shop name already exists", 409);
    }
  }
  // Create snapshot of current state BEFORE update
  const snapshotId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_shop_profile_id: currentProfile.id,
      shop_name: currentProfile.shop_name,
      shop_description: currentProfile.shop_description ?? "",
      logo_url: currentProfile.logo_url ?? null,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Prepare update data with only provided fields
  const updateData: {
    shop_name?: string;
    shop_description?: string | null;
    logo_url?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
    ...(props.body.shop_name !== undefined && {
      shop_name: props.body.shop_name,
    }),
    ...(props.body.shop_description !== undefined && {
      shop_description: props.body.shop_description,
    }),
    ...(props.body.logo_url !== undefined && { logo_url: props.body.logo_url }),
  };
  // Update the profile
  const updatedProfile =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.update({
      where: { id: currentProfile.id },
      data: updateData,
    });
  // Fetch complete profile with seller and snapshots
  const fullProfile =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findUniqueOrThrow({
      where: { id: updatedProfile.id },
      ...EcommerceMallShopProfileTransformer.select(),
    });
  return await EcommerceMallShopProfileTransformer.transform(fullProfile);
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
// export async function patchEcommerceMallSellerShopProfiles(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallShopProfile.IUpdate;
// }): Promise<IEcommerceMallShopProfile> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shop_profiles.findFirstOrThrow({
//     ...EcommerceMallShopProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShopProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------