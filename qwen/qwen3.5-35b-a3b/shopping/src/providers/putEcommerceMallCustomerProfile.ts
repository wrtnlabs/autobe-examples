import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomer.IUpdate;
}): Promise<IEcommerceMallCustomer> {
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const updateData: {
    updated_at: Date;
  } = { updated_at: new Date() };
  const updatedCustomer = await MyGlobal.prisma.ecommerce_mall_customers.update(
    {
      where: { id: props.customer.id },
      data: updateData,
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  await MyGlobal.prisma.ecommerce_mall_activity_log_of_customers.create({
    data: {
      id: v4(),
      ecommerce_mall_activity_log_id: v4(),
      ecommerce_mall_customer_id: props.customer.id,
      ecommerce_mall_customer_session_id: props.customer.session_id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return {
    id: updatedCustomer.id,
    display_name: "Customer",
    phone_number: null,
    status: customer.status,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    deleted_at: customer.deleted_at?.toISOString() ?? null,
  } satisfies IEcommerceMallCustomer;
}
