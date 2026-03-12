import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IBan;
}): Promise<IShoppingMallCustomer.ISummary> {
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customerId,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (customer.status === "banned") {
    throw new HttpException("Customer is already banned", 400);
  }
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
    },
    data: {
      status: "banned",
      updated_at: new Date(),
    },
    ...ShoppingMallCustomerAtSummaryTransformer.select(),
  });
  return await ShoppingMallCustomerAtSummaryTransformer.transform(updated);
}
