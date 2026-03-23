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

export async function getEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string;
}): Promise<IEcommerceMallAddress> {
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallAddressTransformer.select(),
    });
  if (address.user.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallAddressTransformer.transform(address);
}
