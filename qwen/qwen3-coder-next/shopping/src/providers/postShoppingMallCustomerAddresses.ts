import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerAddress.ICreate;
}): Promise<IShoppingMallCustomerAddress> {
  // Check if customer has any existing addresses to determine if this should be default
  const existingAddresses =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const isDefault = existingAddresses.length === 0;
  const address = await MyGlobal.prisma.shopping_mall_customer_addresses.create(
    {
      data: {
        id: v4(),
        recipient_name: props.body.recipient_name,
        phone_number: props.body.phone_number,
        street_address: props.body.street_address,
        city: props.body.city,
        state: props.body.state,
        postal_code: props.body.postal_code,
        country: props.body.country,
        is_default: isDefault,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        customer: { connect: { id: props.customer.id } },
      },
      ...ShoppingMallCustomerAddressTransformer.select(),
    },
  );
  return await ShoppingMallCustomerAddressTransformer.transform(address);
}
