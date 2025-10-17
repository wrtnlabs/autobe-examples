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

export async function putShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IUpdate;
}): Promise<IShoppingMallAddress> {
  const { customer, addressId, body } = props;

  // Fetch the address and verify it exists
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: addressId },
    });

  // Verify ownership - address must belong to authenticated customer
  if (address.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own addresses",
      403,
    );
  }

  // Update the address with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: addressId },
    data: {
      recipient_name: body.recipient_name ?? undefined,
      city: body.city ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return response matching IShoppingMallAddress structure
  return {
    id: updated.id as string & tags.Format<"uuid">,
    recipient_name: updated.recipient_name,
    phone_number: updated.phone_number,
    address_line1: updated.address_line1,
  };
}
