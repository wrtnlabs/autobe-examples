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

export async function putEcommerceMallCustomerCustomersAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceMallShippingAddress.IUpdate;
}): Promise<IEcommerceMallShippingAddress> {
  // Verify address exists and belongs to the authenticated customer
  const existing =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      where: {
        id: props.addressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
      },
    });
  if (existing === null) {
    throw new HttpException("Address not found or access denied", 404);
  }
  // If setting this address as default, unset other defaults for this customer
  if (props.body.is_default === true) {
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
  }
  // Build update data from provided body fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };
  if (props.body.recipient_name !== undefined) {
    updateData.recipient_name = props.body.recipient_name;
  }
  if (props.body.phone !== undefined) {
    updateData.phone = props.body.phone;
  }
  if (props.body.street_address !== undefined) {
    updateData.street_address = props.body.street_address;
  }
  if (props.body.city !== undefined) {
    updateData.city = props.body.city;
  }
  if (props.body.state !== undefined) {
    updateData.state = props.body.state;
  }
  if (props.body.postal_code !== undefined) {
    updateData.postal_code = props.body.postal_code;
  }
  if (props.body.country !== undefined) {
    updateData.country = props.body.country;
  }
  if (props.body.is_default !== undefined) {
    updateData.is_default = props.body.is_default;
  }
  // Update the address
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });
  // Fetch updated address with transformer select
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
  return await EcommerceMallShippingAddressTransformer.transform(updated);
}
