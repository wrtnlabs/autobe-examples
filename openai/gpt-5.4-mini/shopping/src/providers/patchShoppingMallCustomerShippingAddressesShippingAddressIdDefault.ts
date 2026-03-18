import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShippingAddressTransformer } from "../transformers/ShoppingMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShippingAddressesShippingAddressIdDefault(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShippingAddress> {
  const target =
    await MyGlobal.prisma.shopping_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: props.shippingAddressId },
      select: {
        id: true,
        shopping_mall_customer_profile_id: true,
        deleted_at: true,
      },
    });
  if (target.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const customerProfile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: {
        id: true,
      },
    });
  if (customerProfile.id !== target.shopping_mall_customer_profile_id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_shipping_addresses.updateMany({
      where: {
        shopping_mall_customer_profile_id:
          target.shopping_mall_customer_profile_id,
        id: { not: target.id },
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
    await prisma.shopping_mall_shipping_addresses.update({
      where: { id: target.id },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    });
    return await prisma.shopping_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: target.id },
      ...ShoppingMallShippingAddressTransformer.select(),
    });
  });
  return await ShoppingMallShippingAddressTransformer.transform(updated);
}
