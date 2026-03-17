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
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAddress> {
  // Step 1: Verify address exists and belongs to authenticated customer
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // Step 2: Set target address as default
  const updatedAddress = await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      is_default: true,
      updated_at: new Date(),
    },
  });
  // Step 3: Unset all other default addresses for this customer
  await MyGlobal.prisma.ecommerce_mall_addresses.updateMany({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
      is_default: true,
      id: { not: props.addressId },
    },
    data: {
      is_default: false,
      updated_at: new Date(),
    },
  });
  // Step 4: Query final state for transformer
  const finalAddress =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallAddressTransformer.select(),
    });
  return EcommerceMallAddressTransformer.transform(finalAddress);
}
