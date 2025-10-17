import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerAddresses(props: {
  seller: SellerPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  const { seller, body } = props;

  // Derive country code from country name
  const countryCodeMap: Record<string, string> = {
    USA: "US",
    "United States": "US",
    US: "US",
    Canada: "CA",
    UK: "GB",
    "United Kingdom": "GB",
    GB: "GB",
    Australia: "AU",
    AU: "AU",
  };
  const country_code = countryCodeMap[body.country] || "US";

  // Check if this is the seller's first address to set as default
  const existingAddressCount =
    await MyGlobal.prisma.shopping_mall_addresses.count({
      where: {
        shopping_mall_seller_id: seller.id,
        user_type: "seller",
        deleted_at: null,
      },
    });

  const is_default = existingAddressCount === 0;
  const now = toISOStringSafe(new Date());
  const newId = v4();

  // Create the address record
  const created = await MyGlobal.prisma.shopping_mall_addresses.create({
    data: {
      id: newId,
      shopping_mall_seller_id: seller.id,
      user_type: "seller",
      recipient_name: body.recipient_name,
      phone_number: body.phone_number,
      address_line1: body.address_line1,
      city: body.city,
      state_province: body.state_province,
      postal_code: body.postal_code,
      country: body.country,
      country_code: country_code,
      is_default: is_default,
      is_verified: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    recipient_name: created.recipient_name,
    phone_number: created.phone_number,
    address_line1: created.address_line1,
  };
}
