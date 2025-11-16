import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallOrderCancellations(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderCancellation.IRequest;
}): Promise<IPageIShoppingMallOrderCancellation.ISummary> {
  const {
    orderId = null,
    customerId = null,
    status = null,
    requestedAtFrom = null,
    requestedAtTo = null,
    page = 1,
    pageSize = 10,
  } = props.body;

  const validPage = (typeof page === "number" && page >= 1
    ? page
    : 1) satisfies number as number;
  const validPageSize = (typeof pageSize === "number" && pageSize >= 1
    ? pageSize
    : 10) satisfies number as number;
  const skip = ((validPage - 1) * validPageSize) satisfies number as number;

  const where: {
    order_id?: string | null;
    customer_id?: string | null;
    status?: string | Prisma.StringFilter | undefined;
    requested_at?: {
      gte?: (string & tags.Format<"date-time">) | undefined;
      lte?: (string & tags.Format<"date-time">) | undefined;
    };
  } = {};

  if (orderId === null) {
    where.order_id = null;
  } else if (typeof orderId === "string") {
    where.order_id = orderId satisfies string as string;
  }

  if (customerId === null) {
    where.customer_id = null;
  } else if (typeof customerId === "string") {
    where.customer_id = customerId satisfies string as string;
  }

  if (typeof status === "string") {
    where.status = status satisfies string as string;
  }

  if (requestedAtFrom || requestedAtTo) {
    where.requested_at = {};
    if (requestedAtFrom) {
      where.requested_at.gte = requestedAtFrom satisfies string as string &
        tags.Format<"date-time">;
    }
    if (requestedAtTo) {
      where.requested_at.lte = requestedAtTo satisfies string as string &
        tags.Format<"date-time">;
    }
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where,
      skip,
      take: validPageSize,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_order_cancellations.count({ where }),
  ]);

  const mappedData = data.map((record) => ({
    id: record.id satisfies string as string,
    order_id: record.shopping_mall_order_id satisfies string as string,
    customer_id: record.shopping_mall_customer_id satisfies string as string,
    reason:
      record.reason !== null && record.reason !== undefined
        ? record.reason
        : "",
    status: record.status as "approved" | "pending" | "rejected" | "cancelled",
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at) ?? undefined,
  }));

  return {
    data: mappedData,
    pagination: {
      current: validPage satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: validPageSize satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / validPageSize) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
