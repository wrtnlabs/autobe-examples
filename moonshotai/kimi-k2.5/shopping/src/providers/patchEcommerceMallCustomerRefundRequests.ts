import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with customer filter and optional filters
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.orderItemId && { order_item_id: props.body.orderItemId }),
    ...(props.body.requestedAtFrom || props.body.requestedAtTo
      ? {
          requested_at: {
            ...(props.body.requestedAtFrom && {
              gte: new Date(props.body.requestedAtFrom),
            }),
            ...(props.body.requestedAtTo && {
              lte: new Date(props.body.requestedAtTo),
            }),
          },
        }
      : {}),
  };
  // Query refund requests with pagination
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { requested_at: "desc" },
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  // Transform results and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
