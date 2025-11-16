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

export async function getShoppingMallAdminCustomersCustomerIdAddressesAddressId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_mall_customer_id: props.customerId,
    },
  });
  if (!address) {
    throw new HttpException(
      "Address not found or does not belong to specified customer.",
      404,
    );
  }
  return {
    id: address.id,
    full_name: address.full_name,
    street: address.street,
    city: address.city,
    province: address.province,
    postal_code: address.postal_code,
    country: address.country,
    phone: address.phone,
    is_default: address.is_default,
    created_at: toISOStringSafe(address.created_at),
    shopping_mall_customer_id: address.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: address.shopping_mall_seller_id ?? undefined,
  };
}
