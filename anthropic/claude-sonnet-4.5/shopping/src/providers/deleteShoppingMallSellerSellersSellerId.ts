import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException("You can only delete your own seller account", 403);
  }

  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
    {
      where: {
        id: props.sellerId,
      },
    },
  );

  if (!existingSeller) {
    throw new HttpException("Seller account not found", 404);
  }

  if (existingSeller.deleted_at !== null) {
    return {
      id: existingSeller.id,
      email: existingSeller.email,
      full_name: existingSeller.full_name,
      phone_number: existingSeller.phone_number,
      business_name: existingSeller.business_name,
      business_description: existingSeller.business_description,
      store_name: existingSeller.store_name,
      status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
        existingSeller.status,
      ),
      email_verified: existingSeller.email_verified,
      created_at: toISOStringSafe(existingSeller.created_at),
      updated_at: toISOStringSafe(existingSeller.updated_at),
      deleted_at: toISOStringSafe(existingSeller.deleted_at),
    };
  }

  const deletedSeller = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: props.sellerId,
    },
    data: {
      deleted_at: new Date(),
    },
  });

  return {
    id: deletedSeller.id,
    email: deletedSeller.email,
    full_name: deletedSeller.full_name,
    phone_number: deletedSeller.phone_number,
    business_name: deletedSeller.business_name,
    business_description: deletedSeller.business_description,
    store_name: deletedSeller.store_name,
    status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
      deletedSeller.status,
    ),
    email_verified: deletedSeller.email_verified,
    created_at: toISOStringSafe(deletedSeller.created_at),
    updated_at: toISOStringSafe(deletedSeller.updated_at),
    deleted_at:
      deletedSeller.deleted_at !== null
        ? toISOStringSafe(deletedSeller.deleted_at)
        : toISOStringSafe(new Date()),
  };
}
