import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellerProfilesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfile> {
  const { id } = props;

  const profile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  return {
    id: profile.id,
    shopping_mall_seller_id: profile.shopping_mall_seller_id,
    store_name: profile.store_name,
    business_registration_number: profile.business_registration_number ?? null,
    contact_email: profile.contact_email,
    contact_phone: profile.contact_phone ?? null,
    profile_description: profile.profile_description ?? null,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at: profile.deleted_at ? toISOStringSafe(profile.deleted_at) : null,
  };
}
