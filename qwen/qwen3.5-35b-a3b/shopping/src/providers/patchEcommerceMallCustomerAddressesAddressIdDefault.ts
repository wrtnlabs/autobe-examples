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
  await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
    where: {
      id: props.addressId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_addresses.updateMany({
    data: { is_default: false, updated_at: new Date() },
    where: {
      ecommerce_mall_customer_id: props.customer.id,
      is_default: true,
      id: { not: props.addressId },
    },
  });
  const updatedAddress = await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: { is_default: true, updated_at: new Date() },
    ...EcommerceMallAddressTransformer.select(),
  });
  return await EcommerceMallAddressTransformer.transform(updatedAddress);
}
