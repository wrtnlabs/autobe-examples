import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkUnban";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCustomersBulkUnban(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerBulkUnban.ICreate;
}): Promise<IShoppingMallCustomerBulkUnban.IResult> {
  const success: (string & tags.Format<"uuid">)[] = [];
  const failed: IShoppingMallCustomerBulkUnban.IResultFailedItem[] = [];
  for (const customerId of props.body.customerIds) {
    const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: customerId },
      select: { id: true, status: true, deleted_at: true },
    });
    if (customer === null) {
      failed.push({
        customerId: customerId,
        reason: "customer not found",
      });
      continue;
    }
    if (customer.deleted_at !== null) {
      failed.push({
        customerId: customerId,
        reason: "customer already deleted",
      });
      continue;
    }
    if (customer.status !== "banned") {
      failed.push({
        customerId: customerId,
        reason: "customer not banned",
      });
      continue;
    }
    await MyGlobal.prisma.shopping_mall_customers.update({
      where: { id: customerId },
      data: { status: "active" },
    });
    success.push(customerId);
  }
  return {
    success,
    failed,
  };
}
