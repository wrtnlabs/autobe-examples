import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminActorsSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
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

  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: props.sellerId,
    },
    data: {
      business_name: props.body.business_name,
      business_address: props.body.business_address,
      tax_id: props.body.tax_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    business_name: updated.business_name,
    business_address: updated.business_address,
    tax_id: updated.tax_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    status: typia.assert<
      "active" | "pending_verification" | "suspended" | "deleted"
    >(updated.status),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : typia.assert<string & tags.Format<"date-time">>(""),
  };
}
