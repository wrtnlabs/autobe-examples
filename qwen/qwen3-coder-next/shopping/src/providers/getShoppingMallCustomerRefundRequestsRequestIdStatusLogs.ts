import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefundRequestLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequestLog";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderRefundRequestLogAtSummaryTransformer } from "../transformers/ShoppingMallOrderRefundRequestLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerRefundRequestsRequestIdStatusLogs(props: {
  customer: CustomerPayload;
  requestId: string;
}): Promise<IShoppingMallOrderRefundRequestLog.ISummary[]> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { shopping_mall_order_item_id: true },
      },
    );
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
      select: { shopping_mall_order_id: true },
    });
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const logs =
    await MyGlobal.prisma.shopping_mall_order_refund_request_logs.findMany({
      where: { shopping_mall_order_refund_request_id: props.requestId },
      orderBy: { changed_at: "desc" },
      ...ShoppingMallOrderRefundRequestLogAtSummaryTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    logs,
    ShoppingMallOrderRefundRequestLogAtSummaryTransformer.transform,
  );
}
