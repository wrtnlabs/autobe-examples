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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShippingAddress> {
  // Find the address and verify ownership
  const address =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        recipient_name: true,
        phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    });
  // Verify ownership - address must belong to the authenticated customer
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Address not found", 404);
  }
  // Use transaction to atomically clear previous default and set new default
  await MyGlobal.prisma.$transaction([
    // Clear is_default for all customer's addresses
    MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    }),
    // Set is_default=true for the specified address
    MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
      where: { id: props.addressId },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch the updated address with full details
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
  return EcommerceMallShippingAddressTransformer.transform(updated);
}
