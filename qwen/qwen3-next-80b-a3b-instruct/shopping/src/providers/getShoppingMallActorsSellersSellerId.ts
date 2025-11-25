import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function getShoppingMallActorsSellersSellerId(props: {
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    business_address: seller.business_address,
    tax_id: seller.tax_id,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    status: seller.status satisfies string as
      | "active"
      | "pending_verification"
      | "suspended"
      | "deleted",
    deleted_at: typia.assert<string & tags.Format<"date-time">>(
      seller.deleted_at !== null && seller.deleted_at !== undefined
        ? toISOStringSafe(seller.deleted_at)
        : toISOStringSafe(new Date()),
    ),
  };
}
