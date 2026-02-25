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

export async function deleteShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string;
}): Promise<void> {
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: props.addressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  if (address.is_default) {
    const otherAddress =
      await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
        where: {
          shopping_mall_customer_id: props.customer.id,
          id: { not: props.addressId },
          deleted_at: null,
        },
      });
    if (otherAddress !== null) {
      await MyGlobal.prisma.shopping_mall_customer_addresses.update({
        where: { id: otherAddress.id },
        data: { is_default: true },
      });
    }
  }
  await MyGlobal.prisma.shopping_mall_customer_addresses.delete({
    where: { id: props.addressId },
  });
}
