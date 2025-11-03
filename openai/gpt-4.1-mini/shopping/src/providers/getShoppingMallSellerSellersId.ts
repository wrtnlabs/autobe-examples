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

export async function getShoppingMallSellerSellersId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller.ISummary> {
  const { seller, id } = props;

  const record = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id },
    include: { shopping_mall_seller_profiles: true },
  });

  if (record === null || record.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }

  if (id !== seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const profile = record.shopping_mall_seller_profiles
    ? {
        business_registration_number:
          record.shopping_mall_seller_profiles.business_registration_number ??
          undefined,
        contact_email: record.shopping_mall_seller_profiles.contact_email,
        contact_phone:
          record.shopping_mall_seller_profiles.contact_phone ?? undefined,
        profile_description:
          record.shopping_mall_seller_profiles.profile_description ?? undefined,
        created_at: record.shopping_mall_seller_profiles.created_at
          ? toISOStringSafe(record.shopping_mall_seller_profiles.created_at)
          : undefined,
        updated_at: record.shopping_mall_seller_profiles.updated_at
          ? toISOStringSafe(record.shopping_mall_seller_profiles.updated_at)
          : undefined,
        deleted_at: record.shopping_mall_seller_profiles.deleted_at
          ? toISOStringSafe(record.shopping_mall_seller_profiles.deleted_at)
          : null,
      }
    : undefined;

  return {
    id: record.id,
    email: record.email as string & tags.Format<"email">,
    store_name: record.store_name,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    is_active: record.deleted_at === null,
    profile,
  };
}
