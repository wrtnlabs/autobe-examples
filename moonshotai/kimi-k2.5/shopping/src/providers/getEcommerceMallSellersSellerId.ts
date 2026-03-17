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

export async function getEcommerceMallSellersSellerId(props: {
  sellerId: string;
}): Promise<IEcommerceMallSeller> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
    where: {
      id: props.sellerId,
      approval_status: "approved",
      deleted_at: null,
    },
    select: {
      id: true,
      profileSnapshots: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: {
          shop_name: true,
          shop_description: true,
          logo_image_url: true,
          created_at: true,
        },
      },
    } satisfies Prisma.ecommerce_mall_sellersSelect,
  });
  const snapshot = seller.profileSnapshots[0];
  return {
    shopName: snapshot?.shop_name ?? null,
    shopDescription: snapshot?.shop_description ?? null,
    logoImageUrl: snapshot?.logo_image_url
      ? (snapshot.logo_image_url as string & tags.Format<"url">)
      : null,
    createdAt: (snapshot?.created_at.toISOString() ??
      seller.profileSnapshots[0]?.created_at.toISOString()) as string &
      tags.Format<"date-time">,
  } satisfies IEcommerceMallSeller;
}
