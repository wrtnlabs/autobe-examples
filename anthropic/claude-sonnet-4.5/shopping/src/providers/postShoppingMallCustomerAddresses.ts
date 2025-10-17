import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  const { customer, body } = props;

  const deriveCountryCode = (country: string): string => {
    const countryCodeMap: Record<string, string> = {
      "United States": "US",
      "United Kingdom": "GB",
      Canada: "CA",
      Australia: "AU",
      Germany: "DE",
      France: "FR",
      Japan: "JP",
      China: "CN",
      India: "IN",
      Brazil: "BR",
      Mexico: "MX",
      Italy: "IT",
      Spain: "ES",
      Netherlands: "NL",
      Sweden: "SE",
      Norway: "NO",
      Denmark: "DK",
      Finland: "FI",
      Poland: "PL",
      Switzerland: "CH",
      Austria: "AT",
      Belgium: "BE",
      Ireland: "IE",
      "New Zealand": "NZ",
      Singapore: "SG",
      "South Korea": "KR",
      Russia: "RU",
      Argentina: "AR",
      Chile: "CL",
      Colombia: "CO",
      Peru: "PE",
      Venezuela: "VE",
      "South Africa": "ZA",
      Egypt: "EG",
      Nigeria: "NG",
      Kenya: "KE",
      Thailand: "TH",
      Vietnam: "VN",
      Malaysia: "MY",
      Indonesia: "ID",
      Philippines: "PH",
      Pakistan: "PK",
      Bangladesh: "BD",
      Turkey: "TR",
      "Saudi Arabia": "SA",
      "United Arab Emirates": "AE",
      Israel: "IL",
    };

    return countryCodeMap[country] || "US";
  };

  const country_code = deriveCountryCode(body.country);

  const existingAddressCount =
    await MyGlobal.prisma.shopping_mall_addresses.count({
      where: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    });

  const is_default = existingAddressCount === 0;

  const now = toISOStringSafe(new Date());
  const addressId = v4();

  const created = await MyGlobal.prisma.shopping_mall_addresses.create({
    data: {
      id: addressId,
      shopping_mall_customer_id: customer.id,
      user_type: "customer",
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
