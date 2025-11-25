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

export async function putShoppingMallAdminBuyersBuyerId(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
  body: IShoppingMallBuyer.IUpdate;
}): Promise<IShoppingMallBuyer> {
  const existing = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: props.buyerId },
  });

  if (!existing) {
    throw new HttpException("Buyer not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_buyers.update({
    where: { id: props.buyerId },
    data: {
      ...(props.body.full_name !== undefined && {
        full_name: props.body.full_name,
      }),
      ...(props.body.email !== undefined && {
        email: props.body.email,
      }),
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
