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
import { ShoppingMallShippingAddressCollector } from "../collectors/ShoppingMallShippingAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShippingAddressTransformer } from "../transformers/ShoppingMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShippingAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallShippingAddress.ICreate;
}): Promise<IShoppingMallShippingAddress> {
  const customerProfile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findFirstOrThrow({
      where: {
        id: props.customer.id,
      },
      select: {
        id: true,
      },
    });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.isDefault) {
      await tx.shopping_mall_shipping_addresses.updateMany({
        where: {
          shopping_mall_customer_profile_id: customerProfile.id,
        },
        data: {
          is_default: false,
        },
      });
    }
    return await tx.shopping_mall_shipping_addresses.create({
      data: await ShoppingMallShippingAddressCollector.collect({
        body: props.body,
        customerProfile,
      }),
      ...ShoppingMallShippingAddressTransformer.select(),
    });
  });
  return await ShoppingMallShippingAddressTransformer.transform(created);
}
