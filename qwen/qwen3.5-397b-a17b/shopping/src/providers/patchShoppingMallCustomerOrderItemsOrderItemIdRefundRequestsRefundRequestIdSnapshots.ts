import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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

export async function patchShoppingMallCustomerOrderItemsOrderItemIdRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: { id: true, customer_id: true, order_item_id: true },
    });
  if (refundRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (refundRequest.order_item_id !== props.orderItemId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = (props.body.sort ?? "DESC").toLowerCase() as "asc" | "desc";
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where: { shopping_mall_refund_request_id: props.refundRequestId },
      skip,
      take: limit,
      orderBy: { created_at: sort },
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response: true,
        responded_at: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where: { shopping_mall_refund_request_id: props.refundRequestId },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((snapshot) => ({
      id: snapshot.id,
      reason: snapshot.reason,
      status: snapshot.status,
      seller_response: snapshot.seller_response,
      responded_at: snapshot.responded_at
        ? toISOStringSafe(snapshot.responded_at)
        : null,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
  };
}
