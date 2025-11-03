import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingCustomerAddress> {
  const { customer, customerId, addressId } = props;

  // Ownership enforcement: customer.id must match customerId parameter
  if (customer.id !== customerId) {
    throw new HttpException(
      "Forbidden: Customers can only access their own address",
      403,
    );
  }

  const address = await MyGlobal.prisma.shopping_customer_addresses.findFirst({
    where: {
      id: addressId,
      shopping_customer_id: customerId,
      deleted_at: null,
    },
  });
  if (!address) {
    throw new HttpException(
      "Not Found: Address does not exist or is deleted",
      404,
    );
  }

  return {
    id: address.id,
    shopping_customer_id: address.shopping_customer_id,
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? undefined,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    is_primary: address.is_primary,
    phone: address.phone,
    recipient_name: address.recipient_name,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
    deleted_at: address.deleted_at
      ? toISOStringSafe(address.deleted_at)
      : undefined,
  };
}
