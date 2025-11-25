import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerBuyersBuyerId(props: {
  buyer: BuyerPayload;
  buyerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBuyer> {
  const buyerRecord = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: {
      id: props.buyerId,
    },
  });

  if (!buyerRecord || buyerRecord.deleted_at !== null) {
    throw new HttpException("Buyer not found", 404);
  }

  return {
    id: buyerRecord.id,
    email: buyerRecord.email,
    full_name: buyerRecord.full_name,
    phone_number: buyerRecord.phone_number ?? null,
    email_verified: buyerRecord.email_verified,
    created_at: toISOStringSafe(buyerRecord.created_at),
    updated_at: toISOStringSafe(buyerRecord.updated_at),
    deleted_at: buyerRecord.deleted_at
      ? toISOStringSafe(buyerRecord.deleted_at)
      : null,
  };
}
