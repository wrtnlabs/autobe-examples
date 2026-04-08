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

export async function putEcommerceMallSellerShopProfilesShopProfileId(props: {
  seller: SellerPayload;
  shopProfileId: string & tags.Format<"uuid">;
  body: IEcommerceMallShopProfile.IUpdate;
}): Promise<IEcommerceMallShopProfile> {
  const { shop_name, shop_description, logo_url } = props.body;
  const hasShopName = shop_name !== undefined;
  const hasShopDescription = shop_description !== undefined;
  const hasLogoUrl = logo_url !== undefined;
  if (!hasShopName && !hasShopDescription && !hasLogoUrl) {
    throw new HttpException("At least one field must be provided", 422);
  }
  if (hasShopName) {
    const name = shop_name!;
    if (name.length < 1 || name.length > 100) {
      throw new HttpException("shop_name must be 1-100 characters", 422);
    }
  }
  if (hasShopDescription && shop_description !== null) {
    const desc = shop_description!;
    if (desc.length > 5000) {
      throw new HttpException(
        "shop_description must not exceed 5000 characters",
        422,
      );
    }
  }
  if (hasLogoUrl && logo_url !== null) {
    const url = logo_url!;
    try {
      new URL(url);
    } catch {
      throw new HttpException("logo_url must be a valid URI", 422);
    }
    if (url.length > 80000) {
      throw new HttpException("logo_url must not exceed 80000 characters", 422);
    }
  }
  const existing =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findUniqueOrThrow({
      where: { id: props.shopProfileId },
      include: {
        seller: {
          select: {
            id: true,
            approval_status: true,
            is_suspended: true,
          },
        },
      },
    });
  if (existing.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (existing.seller.approval_status !== "approved") {
    throw new HttpException("Forbidden", 403);
  }
  if (existing.seller.is_suspended) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  const snapshotId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_shop_profile_id: props.shopProfileId,
      shop_name: existing.shop_name ?? "",
      shop_description: existing.shop_description ?? "",
      logo_url: existing.logo_url ?? "",
      created_at: now,
    },
  });
  const data: Prisma.ecommerce_mall_shop_profilesUpdateInput = {
    updated_at: now,
  };
  if (hasShopName) {
    data.shop_name = shop_name!;
  }
  if (hasShopDescription) {
    data.shop_description = shop_description!;
  }
  if (hasLogoUrl) {
    data.logo_url = logo_url!;
  }
  await MyGlobal.prisma.ecommerce_mall_shop_profiles.update({
    where: { id: props.shopProfileId },
    data,
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shop_profiles.findUniqueOrThrow({
      where: { id: props.shopProfileId },
      ...EcommerceMallShopProfileTransformer.select(),
    });
  return await EcommerceMallShopProfileTransformer.transform(updated);
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
// export async function putEcommerceMallSellerShopProfilesShopProfileId(props: {
//   seller: SellerPayload;
//   shopProfileId: string & tags.Format<"uuid">;
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