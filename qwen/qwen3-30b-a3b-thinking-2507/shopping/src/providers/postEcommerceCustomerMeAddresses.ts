import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCustomerAddressCollector } from "../collectors/EcommerceCustomerAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerAddressTransformer } from "../transformers/EcommerceCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerMeAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerAddress.ICreate;
}): Promise<IEcommerceCustomerAddress> {
  const data = await EcommerceCustomerAddressCollector.collect({
    body: props.body,
    customer: props.customer,
  });
  const created = await MyGlobal.prisma.ecommerce_customer_addresses.create({
    data,
    ...EcommerceCustomerAddressTransformer.select(),
  });
  return await EcommerceCustomerAddressTransformer.select().transform(created);
}
