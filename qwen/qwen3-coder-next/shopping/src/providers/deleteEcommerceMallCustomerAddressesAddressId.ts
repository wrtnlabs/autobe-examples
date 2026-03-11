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

export async function deleteEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string;
}): Promise<void> {
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        user_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        is_default: true,
        customer_profile_id: true,
        orders: {
          where: {
            order_status: { in: ["paid", "shipped", "delivered"] },
          },
          select: { id: true },
        },
      },
    });
  const addressCount = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: {
      customer_profile_id: address.customer_profile_id,
      deleted_at: null,
    },
  });
  if (addressCount === 1) {
    throw new HttpException("Cannot delete the only remaining address", 400);
  }
  if (address.orders.length > 0) {
    throw new HttpException(
      "Address is associated with active or completed orders and cannot be deleted",
      400,
    );
  }
  if (address.is_default) {
    await MyGlobal.prisma.ecommerce_mall_addresses.update({
      where: { id: address.id },
      data: { deleted_at: new Date().toISOString() },
    });
    await MyGlobal.prisma.ecommerce_mall_addresses.updateMany({
      where: {
        customer_profile_id: address.customer_profile_id,
        id: { not: address.id },
        deleted_at: null,
      },
      data: { is_default: true },
    });
  } else {
    await MyGlobal.prisma.ecommerce_mall_addresses.update({
      where: { id: address.id },
      data: { deleted_at: new Date().toISOString() },
    });
  }
}
