import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminBuyersBuyerId(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyer> {
  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: {
      id: props.buyerId,
    },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  return {
    id: buyer.id,
    email: buyer.email,
    full_name: buyer.full_name,
    phone_number: buyer.phone_number,
    email_verified: buyer.email_verified,
    created_at: toISOStringSafe(buyer.created_at),
    updated_at: toISOStringSafe(buyer.updated_at),
    deleted_at: buyer.deleted_at ? toISOStringSafe(buyer.deleted_at) : null,
  };
}
