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
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        email: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        approval_status: true,
        is_suspended: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? undefined,
    logo_url: seller.logo_url ?? undefined,
    approval_status: seller.approval_status,
    is_suspended: seller.is_suspended,
    created_at: seller.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: seller.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: seller.deleted_at
      ? (seller.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
  };
}
