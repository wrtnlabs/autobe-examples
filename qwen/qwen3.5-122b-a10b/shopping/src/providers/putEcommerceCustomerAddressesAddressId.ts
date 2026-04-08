import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceAddressTransformer } from "../transformers/EcommerceAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceAddress.IUpdate;
}): Promise<IEcommerceAddress> {
  // Verify address exists and belongs to the authenticated customer
  const address = await MyGlobal.prisma.ecommerce_addresses.findUniqueOrThrow({
    where: {
      id: props.addressId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_customer_id: true,
      is_default: true,
    },
  });
  if (address.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Handle default address constraint
  if (props.body.is_default === true && address.is_default !== true) {
    // Unset the previous default address for this customer
    await MyGlobal.prisma.ecommerce_addresses.updateMany({
      where: {
        ecommerce_customer_id: props.customer.id,
        is_default: true,
        id: { not: props.addressId },
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Update the address with provided fields
  const updateData: Prisma.ecommerce_addressesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.recipient_name !== undefined) {
    updateData.recipient_name = props.body.recipient_name;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
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
  await MyGlobal.prisma.ecommerce_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });
  // Fetch the updated address with full data
  const updated = await MyGlobal.prisma.ecommerce_addresses.findUniqueOrThrow({
    where: { id: props.addressId },
    ...EcommerceAddressTransformer.select(),
  });
  return await EcommerceAddressTransformer.transform(updated);
}
