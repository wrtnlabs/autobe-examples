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

export async function deleteMallPlatformCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const address =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUnique({
      where: {
        id: props.shippingAddressId,
      },
      select: {
        id: true,
        customer_id: true,
        is_default: true,
      },
    });
  if (address === null || address.customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const current = await prisma.mall_platform_shipping_addresses.findUnique({
      where: {
        id: props.shippingAddressId,
      },
      select: {
        id: true,
        customer_id: true,
        is_default: true,
      },
    });
    if (current === null || current.customer_id !== props.customer.id) {
      throw new HttpException("Not Found", 404);
    }
    if (current.is_default) {
      await prisma.mall_platform_shipping_addresses.update({
        where: {
          id: props.shippingAddressId,
        },
        data: {
          is_default: false,
        },
      });
    }
    await prisma.mall_platform_shipping_addresses.delete({
      where: {
        id: props.shippingAddressId,
      },
    });
  });
}
