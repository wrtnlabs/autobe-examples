import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomersCustomerId(props: {
  customerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomer> {
  const record = await MyGlobal.prisma.ecommerce_customers.findFirstOrThrow({
    ...EcommerceCustomerTransformer.select(),
    where: {
      id: props.customerId,
      deleted_at: null,
    },
  });
  return await EcommerceCustomerTransformer.transform(record);
}
