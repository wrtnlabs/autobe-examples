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

export async function getShoppingMallAdminSellersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller.ISummary> {
  const { id } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      store_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shopping_mall_seller_profiles: {
        select: {
          business_registration_number: true,
          contact_email: true,
          contact_phone: true,
          profile_description: true,
          // Removed store_logo_url because it does not exist in Prisma schema for shopping_mall_seller_profiles
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });

  return {
    id: seller.id,
    email: seller.email,
    store_name: seller.store_name,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    is_active: seller.deleted_at === null,
    profile: seller.shopping_mall_seller_profiles
      ? {
          business_registration_number:
            seller.shopping_mall_seller_profiles.business_registration_number ??
            undefined,
          contact_email: seller.shopping_mall_seller_profiles.contact_email,
          contact_phone:
            seller.shopping_mall_seller_profiles.contact_phone ?? undefined,
          profile_description:
            seller.shopping_mall_seller_profiles.profile_description ??
            undefined,
          // Removed store_logo_url property references
          created_at: seller.shopping_mall_seller_profiles.created_at
            ? toISOStringSafe(seller.shopping_mall_seller_profiles.created_at)
            : undefined,
          updated_at: seller.shopping_mall_seller_profiles.updated_at
            ? toISOStringSafe(seller.shopping_mall_seller_profiles.updated_at)
            : undefined,
          deleted_at:
            seller.shopping_mall_seller_profiles.deleted_at !== null &&
            seller.shopping_mall_seller_profiles.deleted_at !== undefined
              ? toISOStringSafe(seller.shopping_mall_seller_profiles.deleted_at)
              : null,
        }
      : undefined,
  };
}
