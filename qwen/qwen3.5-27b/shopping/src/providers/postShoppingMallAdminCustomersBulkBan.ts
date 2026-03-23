import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerBulkBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkBan";
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

export async function postShoppingMallAdminCustomersBulkBan(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerBulkBan.ICreate;
}): Promise<IShoppingMallCustomerBulkBan.IResult> {
  const results: IShoppingMallCustomerBulkBan.IResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  for (const customerId of props.body.customerIds) {
    try {
      const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique(
        {
          where: {
            id: customerId,
          },
          select: {
            id: true,
            status: true,
          },
        },
      );
      if (customer === null) {
        results.push({
          customerId: customerId,
          status: "failed",
          errorMessage: "customer not found",
        } satisfies IShoppingMallCustomerBulkBan.IResultItem);
        failureCount++;
        continue;
      }
      if (customer.status === "banned") {
        results.push({
          customerId: customerId,
          status: "skipped",
          errorMessage: null,
        } satisfies IShoppingMallCustomerBulkBan.IResultItem);
        skippedCount++;
        continue;
      }
      await MyGlobal.prisma.shopping_mall_customers.update({
        where: {
          id: customerId,
        },
        data: {
          status: "banned",
          updated_at: new Date(),
        },
      });
      results.push({
        customerId: customerId,
        status: "success",
        errorMessage: null,
      } satisfies IShoppingMallCustomerBulkBan.IResultItem);
      successCount++;
    } catch (error) {
      results.push({
        customerId: customerId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "unknown error",
      } satisfies IShoppingMallCustomerBulkBan.IResultItem);
      failureCount++;
    }
  }
  return {
    successCount: successCount,
    failureCount: failureCount,
    skippedCount: skippedCount,
    results: results,
  } satisfies IShoppingMallCustomerBulkBan.IResult;
}
