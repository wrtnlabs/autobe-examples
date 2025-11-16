import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      business_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: seller.id,
    email: seller.email,
    name: seller.name,
    status: typia.assert<"active" | "inactive" | "suspended">(seller.status),
    business_status: typia.assert<"approved" | "pending" | "rejected">(
      seller.business_status,
    ),
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
  };
}
