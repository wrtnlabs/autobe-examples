import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAddressTransformer } from "../transformers/ShoppingMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  // Check if customer has any existing active addresses
  const existingCount = await MyGlobal.prisma.shopping_mall_addresses.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Determine is_default: true if first address, false otherwise
  const isDefault = existingCount === 0;
  // Create the address record
  const created = await MyGlobal.prisma.shopping_mall_addresses.create({
    data: {
      id: v4(),
      recipient_name: props.body.recipientName,
      phone_number: props.body.phoneNumber,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state_province: props.body.stateProvince,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: isDefault,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
    },
    ...ShoppingMallAddressTransformer.select(),
  });
  // Return transformed result
  return await ShoppingMallAddressTransformer.transform(created);
}
