import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function putShoppingMallBuyerBuyersBuyerId(props: {
  buyer: BuyerPayload;
  buyerId: string & tags.Format<"uuid">;
  body: IShoppingMallBuyer.IUpdate;
}): Promise<IShoppingMallBuyer> {
  if (props.buyer.id !== props.buyerId) {
    throw new HttpException("You can only update your own account", 403);
  }

  const existingBuyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: props.buyerId },
  });

  if (!existingBuyer) {
    throw new HttpException("Buyer not found", 404);
  }

  if (existingBuyer.deleted_at !== null) {
    throw new HttpException("Buyer account has been deleted", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_buyers.update({
    where: { id: props.buyerId },
    data: {
      ...(props.body.full_name !== undefined && {
        full_name: props.body.full_name,
      }),
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone_number: updated.phone_number,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
