import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShippingAddress.ICreate;
}): Promise<IEcommerceMallShippingAddress> {
  // Check if customer has any existing non-deleted addresses
  const existingCount =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.count({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // If this is the first address, set as default regardless of input
  // Otherwise use provided is_default value (defaults to false)
  const isDefault =
    existingCount === 0 ? true : (props.body.is_default ?? false);
  // If setting as new default, unset existing default address
  if (isDefault && existingCount > 0) {
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
        is_default: true,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Create new shipping address
  const created =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.create({
      data: {
        id: v4(),
        ecommerce_mall_customer_id: props.customer.id,
        recipient_name: props.body.recipient_name,
        phone: props.body.phone,
        street_address: props.body.street_address,
        city: props.body.city,
        state: props.body.state,
        postal_code: props.body.postal_code,
        country: props.body.country,
        is_default: isDefault,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
  return await EcommerceMallShippingAddressTransformer.transform(created);
}
