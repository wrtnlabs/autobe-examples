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

export async function putShoppingMallSellersProfile(props: {
  seller: {
    id: string & tags.Format<"uuid">;
  };
  body: IShoppingMallSellerProfile.IUpdate;
}): Promise<IShoppingMallSellerProfile> {
  const profile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  const latestApproval =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findFirst({
      where: { seller_id: props.seller.id },
      orderBy: { submitted_at: "desc" },
    });
  if (!latestApproval || latestApproval.status !== "approved") {
    throw new HttpException("Seller not approved", 403);
  }
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_seller_profile_id: profile.id,
      shop_name: profile.shop_name,
      description: profile.description,
      logo_image_uri: profile.logo_image_uri,
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.shopping_mall_seller_profiles.update({
    where: { id: profile.id },
    data: {
      ...(props.body.shop_name !== undefined && {
        shop_name: props.body.shop_name,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_image_uri !== undefined && {
        logo_image_uri: props.body.logo_image_uri,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { id: profile.id },
      ...ShoppingMallSellerProfileTransformer.select(),
    });
  return await ShoppingMallSellerProfileTransformer.transform(updated);
}
