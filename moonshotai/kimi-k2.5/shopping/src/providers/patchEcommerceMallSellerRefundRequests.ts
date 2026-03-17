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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const body = props.body;
  const sellerId = props.seller.id;
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const sortField = body.sortField ?? "submittedAt";
  const sortOrder = body.sortOrder ?? "desc";
  // Build where clause - sellers can only see their own refund requests
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    seller_id: sellerId,
    deleted_at: null,
  };
  // Optional filters
  if (body.status !== undefined && body.status !== null) {
    whereInput.status = body.status;
  }
  if (body.orderItemId !== undefined && body.orderItemId !== null) {
    whereInput.order_item_id = body.orderItemId;
  }
  // Note: customerId filter is ignored for seller endpoint (sellers see all requests for their products)
  // Date range filters
  const requestedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (body.submittedAfter !== undefined && body.submittedAfter !== null) {
    requestedAtFilter.gte = new Date(body.submittedAfter);
  }
  if (body.submittedBefore !== undefined && body.submittedBefore !== null) {
    requestedAtFilter.lte = new Date(body.submittedBefore);
  }
  if (Object.keys(requestedAtFilter).length > 0) {
    whereInput.requested_at = requestedAtFilter;
  }
  const respondedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (body.respondedAfter !== undefined && body.respondedAfter !== null) {
    respondedAtFilter.gte = new Date(body.respondedAfter);
  }
  if (body.respondedBefore !== undefined && body.respondedBefore !== null) {
    respondedAtFilter.lte = new Date(body.respondedBefore);
  }
  if (Object.keys(respondedAtFilter).length > 0) {
    whereInput.responded_at = respondedAtFilter;
  }
  // Search filter on reason field
  const finalWhere: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    ...whereInput,
    ...(body.search !== undefined && body.search !== null
      ? { reason: { contains: body.search, mode: "insensitive" } }
      : {}),
  };
  // Build orderBy
  const orderByInput: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput =
    sortField === "respondedAt"
      ? { responded_at: sortOrder === "asc" ? "asc" : "desc" }
      : { requested_at: sortOrder === "asc" ? "asc" : "desc" };
  // Handle pagination
  let skip: number | undefined;
  let cursor: Prisma.ecommerce_mall_refund_requestsWhereUniqueInput | undefined;
  if (body.cursor !== undefined && body.cursor !== null) {
    cursor = { id: body.cursor };
  } else {
    skip = (page - 1) * limit;
  }
  // Query data with pagination
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: finalWhere,
    orderBy: orderByInput,
    ...(cursor !== undefined
      ? { cursor, skip: 1, take: limit }
      : { skip: skip ?? 0, take: limit }),
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: finalWhere,
  });
  // Transform to DTOs
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
