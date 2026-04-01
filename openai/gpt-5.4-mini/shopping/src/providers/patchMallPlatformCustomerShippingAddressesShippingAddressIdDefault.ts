import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShippingAddressTransformer } from "../transformers/MallPlatformShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShippingAddressesShippingAddressIdDefault(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShippingAddress> {
  const current =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
      where: { id: props.shippingAddressId },
      select: {
        customer_id: true,
        is_default: true,
      },
    });
  if (current.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (current.is_default) {
    const alreadyDefault =
      await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
        where: { id: props.shippingAddressId },
        ...MallPlatformShippingAddressTransformer.select(),
      });
    return await MallPlatformShippingAddressTransformer.transform(
      alreadyDefault,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipping_addresses.updateMany({
      where: {
        customer_id: props.customer.id,
        id: { not: props.shippingAddressId },
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
    await prisma.mall_platform_shipping_addresses.update({
      where: { id: props.shippingAddressId },
      data: {
        is_default: true,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
      where: { id: props.shippingAddressId },
      ...MallPlatformShippingAddressTransformer.select(),
    });
  return await MallPlatformShippingAddressTransformer.transform(updated);
}
