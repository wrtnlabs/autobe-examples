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
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerProfile(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceCustomer> {
  const customer = await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
    ...EcommerceCustomerTransformer.select(),
  });
  return await EcommerceCustomerTransformer.transform(customer);
}
