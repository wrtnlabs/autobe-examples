import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellerProfilesId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfile.IUpdate;
}): Promise<IShoppingMallSellerProfile> {
  const { seller, id, body } = props;

  const profile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUnique({
      where: { id },
    });

  if (!profile) {
    throw new HttpException("Seller profile not found", 404);
  }

  if (profile.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: Cannot update another seller's profile",
      403,
    );
  }

  if (body.contact_email && body.contact_email !== profile.contact_email) {
    const existing =
      await MyGlobal.prisma.shopping_mall_seller_profiles.findFirst({
        where: {
          contact_email: body.contact_email,
          NOT: { id },
        },
      });
    if (existing) {
      throw new HttpException("Conflict: contact_email already in use", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  const updatedProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.update({
      where: { id },
      data: {
        store_name: body.store_name ?? undefined,
        business_registration_number:
          body.business_registration_number === null
            ? null
            : (body.business_registration_number ?? undefined),
        contact_email: body.contact_email ?? undefined,
        contact_phone:
          body.contact_phone === null
            ? null
            : (body.contact_phone ?? undefined),
        profile_description:
          body.profile_description === null
            ? null
            : (body.profile_description ?? undefined),
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
        updated_at: now,
      },
    });

  return {
    id: updatedProfile.id,
    shopping_mall_seller_id: updatedProfile.shopping_mall_seller_id,
    store_name: updatedProfile.store_name,
    business_registration_number:
      updatedProfile.business_registration_number ?? null,
    contact_email: updatedProfile.contact_email,
    contact_phone: updatedProfile.contact_phone ?? null,
    profile_description: updatedProfile.profile_description ?? null,
    created_at: toISOStringSafe(updatedProfile.created_at),
    updated_at: toISOStringSafe(updatedProfile.updated_at),
    deleted_at:
      updatedProfile.deleted_at === null
        ? null
        : toISOStringSafe(updatedProfile.deleted_at),
  };
}
