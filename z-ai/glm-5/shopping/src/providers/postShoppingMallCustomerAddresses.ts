import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAddressCollector } from "../collectors/ShoppingMallAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAddressTransformer } from "../transformers/ShoppingMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  // Check if customer has any existing addresses
  const existingCount = await MyGlobal.prisma.shopping_mall_addresses.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Determine if this should be default:
  // - First address: always default
  // - Otherwise: use request body value (default false)
  const shouldBeDefault = existingCount === 0 || props.body.is_default === true;
  // If setting as default, clear other defaults first
  if (shouldBeDefault) {
    await MyGlobal.prisma.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Create address using collector pattern
  const addressData = await ShoppingMallAddressCollector.collect({
    body: {
      ...props.body,
      is_default: shouldBeDefault,
    },
    shoppingMallCustomers: { id: props.customer.id } satisfies IEntity,
  });
  const created = await MyGlobal.prisma.shopping_mall_addresses.create({
    data: addressData,
    ...ShoppingMallAddressTransformer.select(),
  });
  return await ShoppingMallAddressTransformer.transform(created);
}
