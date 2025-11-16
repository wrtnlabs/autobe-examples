import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerIdAddressesAddressId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      customer: { id: props.customerId },
    },
  });
  if (!address) {
    throw new HttpException("Address not found for this customer.", 404);
  }
  await MyGlobal.prisma.shopping_mall_addresses.delete({
    where: {
      id: props.addressId,
    },
  });
  // Optionally: log audit event here via platform's audit system if required
}
