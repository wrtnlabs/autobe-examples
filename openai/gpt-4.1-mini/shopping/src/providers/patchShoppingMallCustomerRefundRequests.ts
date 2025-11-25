import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const whereCondition = {
    deleted_at: null,
    ...(props.body.refund_status !== undefined
      ? { refund_status: props.body.refund_status }
      : {}),
    ...(() => {
      if (!props.body.requested_at_from && !props.body.requested_at_to)
        return {};
      const dateRange: {
        gte?: string & import("typia").tags.Format<"date-time">;

        lte?: string & import("typia").tags.Format<"date-time">;
      } = {};
      if (props.body.requested_at_from)
        dateRange.gte = props.body.requested_at_from;
      if (props.body.requested_at_to)
        dateRange.lte = props.body.requested_at_to;
      return { requested_at: dateRange };
    })(),
  };

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { requested_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: whereCondition,
    }),
  ]);

  const resultData = data.map((entry) => ({
    id: entry.id,
    shopping_mall_order_id: entry.shopping_mall_order_id,
    refund_amount: entry.refund_amount,
    refund_reason: entry.refund_reason,
    refund_status: entry.refund_status,
    requested_at: toISOStringSafe(entry.requested_at),
    processed_at: entry.processed_at
      ? toISOStringSafe(entry.processed_at)
      : null,
  }));

  return {
    pagination: {
      current: page satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: resultData,
  };
}
