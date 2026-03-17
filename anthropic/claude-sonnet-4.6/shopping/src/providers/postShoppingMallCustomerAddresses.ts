import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCustomerAddressCollector } from "../collectors/ShoppingMallCustomerAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerAddress.ICreate;
}): Promise<IShoppingMallCustomerAddress> {
  if (props.body.isDefault) {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.shopping_mall_customer_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.customer.id,
          deleted_at: null,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
      return tx.shopping_mall_customer_addresses.create({
        data: await ShoppingMallCustomerAddressCollector.collect({
          body: props.body,
          shoppingMallCustomers: { id: props.customer.id },
          shoppingMallCustomerSessions: { id: props.customer.session_id },
        }),
        ...ShoppingMallCustomerAddressTransformer.select(),
      });
    });
    return ShoppingMallCustomerAddressTransformer.transform(created);
  }
  const created = await MyGlobal.prisma.shopping_mall_customer_addresses.create(
    {
      data: await ShoppingMallCustomerAddressCollector.collect({
        body: props.body,
        shoppingMallCustomers: { id: props.customer.id },
        shoppingMallCustomerSessions: { id: props.customer.session_id },
      }),
      ...ShoppingMallCustomerAddressTransformer.select(),
    },
  );
  return ShoppingMallCustomerAddressTransformer.transform(created);
}
