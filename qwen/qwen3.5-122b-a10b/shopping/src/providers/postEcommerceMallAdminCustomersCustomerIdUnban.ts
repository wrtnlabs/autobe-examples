import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerTransformer } from "../transformers/EcommerceMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminCustomersCustomerIdUnban(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomer> {
  // Verify customer exists
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: {
        id: true,
        account_status: true,
      },
    });
  // Validate customer is in banned status
  if (customer.account_status !== "banned") {
    throw new HttpException("Customer account is not banned", 409);
  }
  // Update account status from banned to active
  await MyGlobal.prisma.ecommerce_mall_customers.update({
    where: { id: props.customerId },
    data: {
      account_status: "active",
      updated_at: new Date(),
    },
  });
  // Fetch updated customer with all fields
  const updated =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...EcommerceMallCustomerTransformer.select(),
    });
  return await EcommerceMallCustomerTransformer.transform(updated);
}
