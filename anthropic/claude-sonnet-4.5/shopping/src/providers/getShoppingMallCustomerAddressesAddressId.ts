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

export async function getShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddress> {
  const { customer, addressId } = props;

  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: addressId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      recipient_name: true,
      phone_number: true,
      address_line1: true,
    },
  });

  if (!address) {
    throw new HttpException("Address not found", 404);
  }

  return {
    id: address.id as string & tags.Format<"uuid">,
    recipient_name: address.recipient_name,
    phone_number: address.phone_number,
    address_line1: address.address_line1,
  };
}
