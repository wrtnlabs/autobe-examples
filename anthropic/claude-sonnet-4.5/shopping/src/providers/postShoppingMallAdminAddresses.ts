import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminAddresses(props: {
  admin: AdminPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  const { admin, body } = props;

  const addressId = v4() as string & tags.Format<"uuid">;

  const existingAddressCount =
    await MyGlobal.prisma.shopping_mall_addresses.count({
      where: {
        shopping_mall_admin_id: admin.id,
        deleted_at: null,
      },
    });

  const isFirstAddress = existingAddressCount === 0;

  const countryCodeMap: Record<string, string> = {
    "United States": "US",
    "United Kingdom": "GB",
    Canada: "CA",
    Australia: "AU",
    Germany: "DE",
    France: "FR",
    Italy: "IT",
    Spain: "ES",
    Japan: "JP",
    China: "CN",
    India: "IN",
    Brazil: "BR",
    Mexico: "MX",
    "South Korea": "KR",
    Netherlands: "NL",
  };

  const countryCode = countryCodeMap[body.country] ?? "US";
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_addresses.create({
    data: {
      id: addressId,
      shopping_mall_admin_id: admin.id,
      user_type: "admin",
      recipient_name: body.recipient_name,
      phone_number: body.phone_number,
      address_line1: body.address_line1,
      address_line2: null,
      city: body.city,
      state_province: body.state_province,
      postal_code: body.postal_code,
      country: body.country,
      country_code: countryCode,
      is_default: isFirstAddress,
      label: null,
      is_verified: false,
      verified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    recipient_name: created.recipient_name,
    phone_number: created.phone_number,
    address_line1: created.address_line1,
  };
}
