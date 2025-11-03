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

export async function postShoppingMallSellerSellerProfiles(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerProfile.ICreate;
}): Promise<IShoppingMallSellerProfile> {
  const { seller, body } = props;

  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_seller_profiles.create({
    data: {
      id,
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      store_name: body.store_name,
      business_registration_number: body.business_registration_number ?? null,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone ?? null,
      profile_description: body.profile_description ?? null,
      created_at: toISOStringSafe(body.created_at),
      updated_at: toISOStringSafe(body.updated_at),
      deleted_at: body.deleted_at ? toISOStringSafe(body.deleted_at) : null,
    },
  });

  return {
    ...created,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
