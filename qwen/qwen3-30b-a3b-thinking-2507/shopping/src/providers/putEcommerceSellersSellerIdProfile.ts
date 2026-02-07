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
import { EcommerceSellerProfileTransformer } from "../transformers/EcommerceSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellersSellerIdProfile(props: {
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceSellerProfile.IUpdate;
}): Promise<IEcommerceSellerProfile> {
  const current = await MyGlobal.prisma.ecommerce_seller_profiles.findFirst({
    where: { ecommerce_seller_id: props.sellerId },
    select: {
      id: true,
      shop_name: true,
      shop_description: true,
      logo_url: true,
      seller: true,
    },
  });
  if (!current) {
    throw new HttpException("Seller profile not found", 404);
  }
  const dataToUpdate: Record<string, unknown> = {};
  if (props.body.shopName !== undefined)
    dataToUpdate.shop_name = props.body.shopName;
  if (props.body.shopDescription !== undefined)
    dataToUpdate.shop_description = props.body.shopDescription;
  if (props.body.logoUrl !== undefined)
    dataToUpdate.logo_url = props.body.logoUrl;
  if (Object.keys(dataToUpdate).length === 0) {
    return EcommerceSellerProfileTransformer.transform(current);
  }
  const updated = await MyGlobal.prisma.ecommerce_seller_profiles.update({
    where: { id: current.id },
    data: dataToUpdate,
  });
  await MyGlobal.prisma.ecommerce_seller_profile_snapshots.create({
    data: {
      sellerProfileId: current.id,
      before: JSON.stringify({
        shop_name: current.shop_name,
        shop_description: current.shop_description,
        logo_url: current.logo_url,
      }),
      after: JSON.stringify({
        shop_name: updated.shop_name,
        shop_description: updated.shop_description,
        logo_url: updated.logo_url,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
  return EcommerceSellerProfileTransformer.transform(updated);
}
