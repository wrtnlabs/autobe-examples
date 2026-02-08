import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy: { requested_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where,
  });
  const summaries: IShoppingMallRefundRequest.ISummary[] = data.map(
    (record) => ({
      shopping_mall_order_item_id: record.shopping_mall_order_item_id,
      shopping_mall_customer_id: record.shopping_mall_customer_id,
      shopping_mall_seller_id: record.shopping_mall_seller_id,
      id: record.id,
      request_reason: record.request_reason,
      status: record.status,
      seller_response_reason: record.seller_response_reason ?? null,
      requested_at: toISOStringSafe(record.requested_at),
      responded_at: record.responded_at
        ? toISOStringSafe(record.responded_at)
        : null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    }),
  );
  return {
    data: summaries,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
