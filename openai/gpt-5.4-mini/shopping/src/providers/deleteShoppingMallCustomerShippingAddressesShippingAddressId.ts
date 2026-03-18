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

export async function deleteShoppingMallCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shippingAddress =
    await MyGlobal.prisma.shopping_mall_shipping_addresses.findUniqueOrThrow({
      where: {
        id: props.shippingAddressId,
      },
      select: {
        id: true,
        shopping_mall_customer_profile_id: true,
      },
    });
  if (shippingAddress.shopping_mall_customer_profile_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_shipping_addresses.delete({
    where: {
      id: props.shippingAddressId,
    },
  });
}
