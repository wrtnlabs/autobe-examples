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
  const addressCount = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  const is_default: boolean = addressCount === 0;
  const customerEntity: IEntity = {
    id: props.customer.id,
  };
  const created = await MyGlobal.prisma.ecommerce_mall_addresses.create({
    data: await EcommerceMallAddressCollector.collect({
      body: props.body,
      ecommerceMallCustomers: customerEntity,
    }),
    ...EcommerceMallAddressTransformer.select(),
  });
  return await EcommerceMallAddressTransformer.transform(created);
}
