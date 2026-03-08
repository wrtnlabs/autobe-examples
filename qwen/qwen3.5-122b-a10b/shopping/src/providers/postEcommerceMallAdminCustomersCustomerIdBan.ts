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

export async function postEcommerceMallAdminCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomer> {
  // Fetch customer - throws 404 if not found
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: { id: true, account_status: true },
    } satisfies Prisma.ecommerce_mall_customersFindUniqueArgs);
  // Check if already banned - throw 409 Conflict
  if (customer.account_status === "banned") {
    throw new HttpException("Customer is already banned", 409);
  }
  // Update account status to banned
  await MyGlobal.prisma.ecommerce_mall_customers.update({
    where: { id: props.customerId },
    data: {
      account_status: "banned",
      updated_at: new Date(),
    },
  });
  // Fetch updated customer with transformer select
  const updated =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...EcommerceMallCustomerTransformer.select(),
    });
  // Transform to DTO
  return await EcommerceMallCustomerTransformer.transform(updated);
}
