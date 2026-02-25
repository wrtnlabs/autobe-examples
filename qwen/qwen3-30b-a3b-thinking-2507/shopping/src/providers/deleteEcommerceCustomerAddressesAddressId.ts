import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const address =
    await MyGlobal.prisma.ecommerce_customer_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        ecommerce_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  await MyGlobal.prisma.ecommerce_customer_address_snapshots.create({
    data: {
      id: v4(),
      customer_id: address.ecommerce_customer_id,
      recipient_name: address.recipient_name,
      phone: address.phone,
      street_address: address.street_address,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      created_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.ecommerce_customer_addresses.update({
    where: { id: props.addressId },
    data: { deleted_at: new Date() },
  });
}
