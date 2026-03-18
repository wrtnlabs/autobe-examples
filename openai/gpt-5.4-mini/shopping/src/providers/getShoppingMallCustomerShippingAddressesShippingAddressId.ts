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

export async function getShoppingMallCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShippingAddress> {
  const shippingAddress =
    await MyGlobal.prisma.shopping_mall_shipping_addresses.findUniqueOrThrow({
      where: {
        id: props.shippingAddressId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_profile_id: true,
        customerProfile: {
          select: {
            id: true,
          },
        },
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      } satisfies Prisma.shopping_mall_shipping_addressesFindUniqueOrThrowArgs["select"],
    });
  if (shippingAddress.shopping_mall_customer_profile_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallShippingAddressTransformer.transform(
    shippingAddress,
  );
}
