import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition
  const whereCondition = {
    deleted_at: null,
    ...(props.body.status ? { cancellation_status: props.body.status } : {}),
    ...(props.body.search
      ? {
          OR: [{ cancellation_reason: { contains: props.body.search } }],
        }
      : {}),
    ...(props.body.customer_id
      ? {
          shopping_mall_order: {
            customer_id: props.body.customer_id,
          },
        }
      : {}),
    ...(props.body.order_id
      ? { shopping_mall_order_id: props.body.order_id }
      : {}),
  };

  const [cancellations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { requested_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_order_cancellations.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: cancellations.map((cancellation) => ({
      id: cancellation.id,
      shopping_mall_order_id: cancellation.shopping_mall_order_id,
      cancellation_reason: cancellation.cancellation_reason,
      cancellation_status: cancellation.cancellation_status,
      requested_at: toISOStringSafe(cancellation.requested_at),
      processed_at: cancellation.processed_at
        ? toISOStringSafe(cancellation.processed_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
