import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { IPageIShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefund";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallOrderRefunds(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderRefund.IRequest;
}): Promise<IPageIShoppingMallOrderRefund.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: Prisma.shopping_mall_order_refundsWhereInput = {
    AND: [
      {
        ...(props.body.status === undefined || props.body.status === null
          ? {}
          : { status: props.body.status }),
        ...(props.body.minAmount === undefined
          ? {}
          : { amount: { gte: props.body.minAmount ?? 0 } }),
        ...(props.body.maxAmount === undefined
          ? {}
          : { amount: { lte: props.body.maxAmount ?? 0 } }),
        ...(props.body.orderDateFrom === undefined
          ? {}
          : { created_at: { gte: props.body.orderDateFrom ?? undefined } }),
        ...(props.body.orderDateTo === undefined
          ? {}
          : { created_at: { lte: props.body.orderDateTo ?? undefined } }),
      },
      { deleted_at: null },
    ],
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_refunds.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_order_refunds.count({
      where: whereConditions,
    }),
  ]);

  // Mapping Prisma status to IPageIShoppingMallOrderRefund.ISummary.status type
  const statusMapping: Record<
    string,
    "approved" | "pending" | "rejected" | "processed"
  > = {
    rejected: "rejected",
    processing: "pending",
    completed: "processed",
    requested: "approved",
  };

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      order_id: item.shopping_mall_order_id,
      customer_id: item.shopping_mall_customer_id,
      amount: item.amount,
      reason: item.reason ?? "",
      status: typia.assert<"approved" | "pending" | "rejected" | "processed">(
        statusMapping[item.status ?? "rejected"],
      ),
      created_at: toISOStringSafe(item.created_at),
      updated_at:
        item.updated_at === null ? undefined : toISOStringSafe(item.updated_at),
    })),
  };
}
