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

export async function patchShoppingMallAdminOrderCancellations(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderCancellation.IRequest;
}): Promise<IPageIShoppingMallOrderCancellation.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const where = {
    deleted_at: null,
    ...(body.filterStatus !== undefined &&
      body.filterStatus !== null && {
        cancellation_status: body.filterStatus,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        cancellation_reason: {
          contains: body.search,
        },
      }),
  };

  const orderBy = {
    [body.sortBy && body.sortBy.length > 0 ? body.sortBy : "created_at"]:
      body.sortOrder === "asc" ? "asc" : "desc",
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_cancellations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      shopping_mall_customer_id: item.shopping_mall_customer_id,
      cancellation_reason: item.cancellation_reason ?? null,
      cancellation_status: item.cancellation_status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
