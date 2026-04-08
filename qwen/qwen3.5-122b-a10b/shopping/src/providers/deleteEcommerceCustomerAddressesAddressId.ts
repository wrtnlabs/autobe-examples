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
  const address = await MyGlobal.prisma.ecommerce_addresses.findUnique({
    where: {
      id: props.addressId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_customer_id: true,
    },
  });
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  if (address.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.ecommerce_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: new Date(),
    },
  });
}
