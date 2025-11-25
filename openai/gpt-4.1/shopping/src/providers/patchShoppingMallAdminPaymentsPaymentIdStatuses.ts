import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatus";
import { IPageIShoppingMallPaymentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentStatus";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPaymentsPaymentIdStatuses(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentStatus.IRequest;
}): Promise<IPageIShoppingMallPaymentStatus> {
  // Validate payment exists
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId, deleted_at: null },
    select: { id: true },
  });
  if (payment === null) {
    throw new HttpException("Payment not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "changed_at";
  const sortOrder = props.body.order ?? "desc";
  // Build where condition
  const where = {
    payment_id: props.paymentId,
    ...(props.body.status !== undefined && { new_status: props.body.status }),
    ...(props.body.changed_by_admin_id !== undefined && {
      changed_by_admin_id: props.body.changed_by_admin_id,
    }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        OR: [
          { changed_reason: { contains: props.body.search } },
          { old_status: { contains: props.body.search } },
          { new_status: { contains: props.body.search } },
        ],
      }),
  };
  // Query results and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_statuses.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_payment_statuses.count({ where }),
  ]);
  // Format records
  const records = data.map((row) => ({
    id: row.id,
    payment_id: row.payment_id,
    old_status: row.old_status,
    new_status: row.new_status,
    changed_reason: row.changed_reason,
    changed_at: toISOStringSafe(row.changed_at),
    changed_by_admin_id:
      row.changed_by_admin_id === null ? null : row.changed_by_admin_id,
  }));
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records,
  };
}
