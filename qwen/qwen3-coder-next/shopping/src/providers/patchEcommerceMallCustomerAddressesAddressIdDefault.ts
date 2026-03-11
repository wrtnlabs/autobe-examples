import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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

export async function patchEcommerceMallCustomerAddressesAddressIdDefault(props: {
  customer: CustomerPayload;
  addressId: string;
  body: IEcommerceMallAddress.IRequest;
}): Promise<IEcommerceMallAddress> {
  // Find the target address and verify ownership
  const targetAddress =
    await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
      where: {
        id: props.addressId,
        user_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (!targetAddress) {
    throw new HttpException("Address not found or access denied", 404);
  }
  // Update target address as default
  await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      is_default: true,
      updated_at: new Date(),
    },
  });
  // Clear default on all other addresses for this customer
  await MyGlobal.prisma.ecommerce_mall_addresses.updateMany({
    where: {
      user_id: props.customer.id,
      id: { not: props.addressId },
    },
    data: {
      is_default: false,
      updated_at: new Date(),
    },
  });
  // Re-fetch the updated address
  const updatedAddress =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallAddressTransformer.select(),
    });
  return await EcommerceMallAddressTransformer.transform(updatedAddress);
}
