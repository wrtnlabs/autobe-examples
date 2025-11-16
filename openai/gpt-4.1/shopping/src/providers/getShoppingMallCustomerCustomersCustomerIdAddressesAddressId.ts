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

export async function getShoppingMallCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  // Query the address by ID, customer ID linkage, and ensure it is not a seller address
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_mall_customer_id: props.customerId,
      shopping_mall_seller_id: null,
    },
  });

  if (!address) {
    throw new HttpException("Address not found", 404);
  }

  // Auth: Only the customer who owns the address can access
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: You do not have access to this address.",
      403,
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
    shopping_mall_seller_id: undefined,
  };
}
