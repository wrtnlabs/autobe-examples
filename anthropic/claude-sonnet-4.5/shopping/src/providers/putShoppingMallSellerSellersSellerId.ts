import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: You can only update your own account",
      403,
    );
  }

  const existing = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Seller account not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      updated_at: new Date(),
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
      ...(props.body.full_name !== undefined && {
        full_name: props.body.full_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      ...(props.body.business_name !== undefined && {
        business_name: props.body.business_name,
      }),
      ...(props.body.business_description !== undefined && {
        business_description: props.body.business_description,
      }),
      ...(props.body.store_name !== undefined && {
        store_name: props.body.store_name,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone_number: updated.phone_number,
    business_name: updated.business_name,
    business_description: updated.business_description,
    store_name: updated.store_name,
    status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
      updated.status,
    ),
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
