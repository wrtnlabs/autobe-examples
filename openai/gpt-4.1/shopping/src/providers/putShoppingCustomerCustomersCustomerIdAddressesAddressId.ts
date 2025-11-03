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

export async function putShoppingCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingCustomerAddress.IUpdate;
}): Promise<IShoppingCustomerAddress> {
  // 1. Verify address existence, ownership, and not deleted
  const address = await MyGlobal.prisma.shopping_customer_addresses.findFirst({
    where: {
      id: props.addressId,
      shopping_customer_id: props.customerId,
      deleted_at: null,
    },
  });
  if (!address) {
    throw new HttpException("Address not found for this customer", 404);
  }

  // 2. If becoming primary, set other addresses is_primary to false
  if (props.body.is_primary === true) {
    await MyGlobal.prisma.shopping_customer_addresses.updateMany({
      where: {
        shopping_customer_id: props.customerId,
        id: { not: props.addressId },
        deleted_at: null,
        is_primary: true,
      },
      data: {
        is_primary: false,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // 3. Prepare update data from provided fields only, always set updated_at
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.address_line1 !== undefined && {
      address_line1: props.body.address_line1,
    }),
    ...(props.body.address_line2 !== undefined && {
      address_line2: props.body.address_line2,
    }),
    ...(props.body.city !== undefined && { city: props.body.city }),
    ...(props.body.state !== undefined && { state: props.body.state }),
    ...(props.body.postal_code !== undefined && {
      postal_code: props.body.postal_code,
    }),
    ...(props.body.country !== undefined && { country: props.body.country }),
    ...(props.body.is_primary !== undefined && {
      is_primary: props.body.is_primary,
    }),
    ...(props.body.phone !== undefined && { phone: props.body.phone }),
    ...(props.body.recipient_name !== undefined && {
      recipient_name: props.body.recipient_name,
    }),
    updated_at: now,
  };

  // 4. Update address
  const updated = await MyGlobal.prisma.shopping_customer_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });

  // 5. Return to API DTO format
  return {
    id: updated.id,
    shopping_customer_id: updated.shopping_customer_id,
    address_line1: updated.address_line1,
    ...(updated.address_line2 !== undefined && {
      address_line2: updated.address_line2,
    }),
    city: updated.city,
    state: updated.state,
    postal_code: updated.postal_code,
    country: updated.country,
    is_primary: updated.is_primary,
    phone: updated.phone,
    recipient_name: updated.recipient_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(updated.deleted_at !== null && updated.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(updated.deleted_at) }
      : {}),
  };
}
