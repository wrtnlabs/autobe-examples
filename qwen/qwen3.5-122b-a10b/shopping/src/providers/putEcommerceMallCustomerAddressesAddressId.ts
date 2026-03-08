import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAddressTransformer } from "../transformers/EcommerceMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceMallAddress.IUpdate;
}): Promise<IEcommerceMallAddress> {
  // Verify address exists and is not soft-deleted
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId, deleted_at: null },
      select: { id: true, ecommerce_mall_customer_id: true, is_default: true },
    } satisfies Prisma.ecommerce_mall_addressesFindUniqueArgs);
  // Verify ownership
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Handle default address transaction
  if (props.body.isDefault === true && address.is_default === false) {
    await MyGlobal.prisma.$transaction([
      // Clear default from other addresses
      MyGlobal.prisma.ecommerce_mall_addresses.updateMany({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          is_default: true,
          id: { not: props.addressId },
          deleted_at: null,
        },
        data: { is_default: false },
      }),
      // Update target address
      MyGlobal.prisma.ecommerce_mall_addresses.update({
        where: { id: props.addressId },
        data: {
          ...(props.body.recipientName !== undefined && {
            recipient_name: props.body.recipientName,
          }),
          ...(props.body.phoneNumber !== undefined && {
            phone_number: props.body.phoneNumber,
          }),
          ...(props.body.streetAddress !== undefined && {
            street_address: props.body.streetAddress,
          }),
          ...(props.body.city !== undefined && { city: props.body.city }),
          ...(props.body.stateProvince !== undefined && {
            state_province: props.body.stateProvince,
          }),
          ...(props.body.postalCode !== undefined && {
            postal_code: props.body.postalCode,
          }),
          ...(props.body.country !== undefined && {
            country: props.body.country,
          }),
          is_default: true,
        },
      }),
    ]);
  } else {
    // Simple update without default change
    await MyGlobal.prisma.ecommerce_mall_addresses.update({
      where: { id: props.addressId },
      data: {
        ...(props.body.recipientName !== undefined && {
          recipient_name: props.body.recipientName,
        }),
        ...(props.body.phoneNumber !== undefined && {
          phone_number: props.body.phoneNumber,
        }),
        ...(props.body.streetAddress !== undefined && {
          street_address: props.body.streetAddress,
        }),
        ...(props.body.city !== undefined && { city: props.body.city }),
        ...(props.body.stateProvince !== undefined && {
          state_province: props.body.stateProvince,
        }),
        ...(props.body.postalCode !== undefined && {
          postal_code: props.body.postalCode,
        }),
        ...(props.body.country !== undefined && {
          country: props.body.country,
        }),
        ...(props.body.isDefault !== undefined && {
          is_default: props.body.isDefault,
        }),
      },
    });
  }
  // Return updated address
  const updated =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallAddressTransformer.select(),
    } satisfies Prisma.ecommerce_mall_addressesFindUniqueArgs);
  return await EcommerceMallAddressTransformer.transform(updated);
}
