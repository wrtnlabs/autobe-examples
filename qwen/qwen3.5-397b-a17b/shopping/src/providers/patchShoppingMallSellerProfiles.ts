import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProfiles(props: {
  body: IShoppingMallSellerProfile.IUpdate;
}): Promise<IShoppingMallSellerProfile> {
  const currentProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
      where: { deleted_at: null },
      ...ShoppingMallSellerProfileTransformer.select(),
    });
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_seller_profile_id: currentProfile.id,
      shop_name: currentProfile.shop_name,
      shop_description: currentProfile.shop_description,
      logo_image_url: currentProfile.logo_image_url,
      created_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_seller_profiles.update({
    where: { id: currentProfile.id },
    data: {
      ...(props.body.shopName !== undefined && {
        shop_name: props.body.shopName,
      }),
      ...(props.body.shopDescription !== undefined && {
        shop_description: props.body.shopDescription,
      }),
      ...(props.body.logoImageUrl !== undefined && {
        logo_image_url: props.body.logoImageUrl,
      }),
      updated_at: new Date(),
    },
    ...ShoppingMallSellerProfileTransformer.select(),
  });
  return await ShoppingMallSellerProfileTransformer.transform(updated);
}
