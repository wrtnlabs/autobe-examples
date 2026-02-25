import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusLog";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
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

export async function patchShoppingMallCustomerOrdersOrderIdStatusLogs(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallOrderStatusLog.ISummary> {
  const page = 1; // Default page
  const limit = 50; // Default limit
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_order_status_logs.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
    },
    skip,
    take: limit,
    orderBy: {
      id: "asc" as any,
    },
    include: {
      changedBy: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          email_verified: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_status_logs.count({
    where: {
      shopping_mall_order_id: props.orderId,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (log) =>
        ({
          id: log.id as string & tags.Format<"uuid">,
          previous_status: log.previous_status,
          new_status: log.new_status,
          reason: log.reason,
          changed_by: log.changed_by_id
            ? ({
                id: log.changed_by_id as string & tags.Format<"uuid">,
                email: log.changedBy?.email ?? "",
                display_name: log.changedBy?.display_name ?? null,
                phone_number: log.changedBy?.phone_number ?? null,
                email_verified: log.changedBy?.email_verified ?? false,
                created_at: log.changedBy?.created_at
                  ? toISOStringSafe(log.changedBy.created_at)
                  : toISOStringSafe(new Date()),
                updated_at: log.changedBy?.updated_at
                  ? toISOStringSafe(log.changedBy.updated_at)
                  : toISOStringSafe(new Date()),
              } satisfies IShoppingMallCustomer.ISummary)
            : null,
        }) satisfies IShoppingMallOrderStatusLog.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
