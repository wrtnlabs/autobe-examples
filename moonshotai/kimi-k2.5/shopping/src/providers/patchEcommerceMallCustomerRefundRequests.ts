import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const sortField = props.body.sortField ?? "submittedAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.orderItemId && { order_item_id: props.body.orderItemId }),
    ...((props.body.submittedAfter || props.body.submittedBefore) && {
      requested_at: {
        ...(props.body.submittedAfter && {
          gte: new Date(props.body.submittedAfter),
        }),
        ...(props.body.submittedBefore && {
          lte: new Date(props.body.submittedBefore),
        }),
      },
    }),
    ...((props.body.respondedAfter || props.body.respondedBefore) && {
      responded_at: {
        ...(props.body.respondedAfter && {
          gte: new Date(props.body.respondedAfter),
        }),
        ...(props.body.respondedBefore && {
          lte: new Date(props.body.respondedBefore),
        }),
      },
    }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  const orderBy: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput =
    sortField === "respondedAt"
      ? { responded_at: sortOrder === "asc" ? "asc" : "desc" }
      : { requested_at: sortOrder === "asc" ? "asc" : "desc" };
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallRefundRequestAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: pages > 0 ? pages : 0,
    } satisfies IPage.IPagination,
  };
}
