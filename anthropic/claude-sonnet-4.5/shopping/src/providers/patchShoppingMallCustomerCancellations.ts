import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";
import { IPageIShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCancellations(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellation.IRequest;
}): Promise<IPageIShoppingMallCancellation> {
  const { customer, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const [cancellations, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellations.findMany({
      where: {
        requester_customer_id: customer.id,
        ...(body.cancellation_status !== undefined && {
          cancellation_status: body.cancellation_status,
        }),
      },
      orderBy: { requested_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cancellations.count({
      where: {
        requester_customer_id: customer.id,
        ...(body.cancellation_status !== undefined && {
          cancellation_status: body.cancellation_status,
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: cancellations.map((c) => ({
      id: c.id,
      cancellation_status: c.cancellation_status,
    })),
  };
}
