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

export async function postShoppingCustomerCustomersCustomerIdAddresses(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomerAddress.ICreate;
}): Promise<IShoppingCustomerAddress> {
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Unauthorized: You cannot add an address to another customer's account",
      403,
    );
  }

  // Generate timestamps
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_customer_addresses.create({
    data: {
      id: v4(),
      shopping_customer_id: props.customerId,
      address_line1: props.body.address_line1,
      address_line2: props.body.address_line2 ?? null,
      city: props.body.city,
      state: props.body.state,
      postal_code: props.body.postal_code,
      country: props.body.country,
      is_primary: props.body.is_primary,
      phone: props.body.phone,
      recipient_name: props.body.recipient_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_customer_id: created.shopping_customer_id,
    address_line1: created.address_line1,
    address_line2: created.address_line2 ?? undefined,
    city: created.city,
    state: created.state,
    postal_code: created.postal_code,
    country: created.country,
    is_primary: created.is_primary,
    phone: created.phone,
    recipient_name: created.recipient_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
