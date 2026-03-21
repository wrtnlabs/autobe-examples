import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellersSellerIdPublic(props: {
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller.IInvert> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        created_at: true,
        approval_status: true,
        deleted_at: true,
        profile: {
          select: {
            name: true,
            description: true,
            logo_uri: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  const profile = seller.profile;
  const hasValidProfile = profile !== null && profile.deleted_at === null;
  const hasDeletedProfile = profile !== null && profile.deleted_at !== null;
  if (hasDeletedProfile) {
    throw new HttpException("Seller not found", 404);
  }
  return {
    id: seller.id,
    created_at: toISOStringSafe(seller.created_at),
    approval_status: seller.approval_status,
    profile: {
      name: hasValidProfile ? profile.name : "",
      description: hasValidProfile ? profile.description : "",
      logo_uri: hasValidProfile ? profile.logo_uri : null,
    },
  };
}
