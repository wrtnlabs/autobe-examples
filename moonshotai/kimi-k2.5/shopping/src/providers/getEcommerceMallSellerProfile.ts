import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProfile(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSeller> {
  const profile =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: {
        seller_id: props.seller.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  if (profile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  return {
    shopName: profile.shop_name,
    shopDescription: profile.shop_description,
    logoImageUrl: profile.logo_image_url as
      | (string & tags.Format<"url">)
      | null,
    createdAt: profile.created_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
