import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerProfileTransformer } from "../transformers/EcommerceSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProfilesProfileId(props: {
  seller: SellerPayload;
  profileId: string & tags.Format<"uuid">;
  body: IEcommerceSellerProfile.IUpdate;
}): Promise<IEcommerceSellerProfile> {
  const profile =
    await MyGlobal.prisma.ecommerce_seller_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
      select: {
        id: true,
        ecommerce_seller_id: true,
        deleted_at: true,
      },
    });
  if (profile.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (profile.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { is_banned: true },
  });
  if (seller.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.ecommerce_seller_profiles.update({
    where: { id: props.profileId },
    data: {
      ...(props.body.shop_name !== undefined && {
        shop_name: props.body.shop_name,
      }),
      ...(props.body.shop_description !== undefined && {
        shop_description: props.body.shop_description,
      }),
      ...(props.body.logo_image_url !== undefined && {
        logo_image_url: props.body.logo_image_url,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_seller_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
      ...EcommerceSellerProfileTransformer.select(),
    });
  return await EcommerceSellerProfileTransformer.transform(updated);
}
