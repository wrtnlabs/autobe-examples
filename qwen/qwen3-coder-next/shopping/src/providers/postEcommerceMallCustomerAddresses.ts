import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAddressCollector } from "../collectors/EcommerceMallAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAddressTransformer } from "../transformers/EcommerceMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAddress.ICreate;
}): Promise<IEcommerceMallAddress> {
  const address = await MyGlobal.prisma.ecommerce_mall_addresses.create({
    data: await EcommerceMallAddressCollector.collect({
      body: props.body,
      ecommerceMallCustomerProfiles: { id: props.customer.id },
      ecommerceMallCustomers: { id: props.customer.id },
    }),
    ...EcommerceMallAddressTransformer.select(),
  });
  return await EcommerceMallAddressTransformer.transform(address);
}
