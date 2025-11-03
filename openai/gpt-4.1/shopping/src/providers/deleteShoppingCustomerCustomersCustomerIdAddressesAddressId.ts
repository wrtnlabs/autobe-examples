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

export async function deleteShoppingCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingCustomerAddress> {
  const { customer, customerId, addressId } = props;

  if (customer.id !== customerId) {
    throw new HttpException(
      "Unauthorized: you can only delete your own address",
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
    throw new HttpException("Address not found", 404);
  }

  const deleted_at = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_customer_addresses.update({
    where: { id: addressId },
    data: { deleted_at },
  });

  return {
    id: updated.id,
    shopping_customer_id: updated.shopping_customer_id,
    address_line1: updated.address_line1,
    address_line2:
      typeof updated.address_line2 === "string"
        ? updated.address_line2
        : updated.address_line2 === null
          ? null
          : undefined,
    city: updated.city,
    state: updated.state,
    postal_code: updated.postal_code,
    country: updated.country,
    is_primary: updated.is_primary,
    phone: updated.phone,
    recipient_name: updated.recipient_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at,
  };
}
