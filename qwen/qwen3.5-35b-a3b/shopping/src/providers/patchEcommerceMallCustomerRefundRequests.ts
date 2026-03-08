import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  // Build base where clause
  const baseWhere: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.request_status !== undefined && {
      request_status: props.body.request_status,
    }),
    ...(props.body.order_item_id !== undefined && {
      order_item_id: props.body.order_item_id,
    }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
    ...(props.body.reason !== undefined && {
      reason: { contains: props.body.reason, mode: "insensitive" },
    }),
  };
  // Customer authorization filter - only their own refund requests
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    ...baseWhere,
    orderItem: {
      order: {
        customer_id: props.customer.id,
      },
    },
  };
  // Build orderBy with cursor support
  let orderByInput: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput[] =
    [{ created_at: "desc" as const }];
  // Handle cursor-based pagination
  let cursorInput: Prisma.ecommerce_mall_refund_requestsWhereInput | undefined;
  if (cursor !== undefined) {
    const cursorData =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
        where: { id: cursor },
        select: { created_at: true },
      });
    if (cursorData === null) {
      throw new HttpException("Invalid cursor", 400);
    }
    orderByInput = [{ created_at: "desc" as const, id: "desc" as const }];
    cursorInput = { created_at: { lt: cursorData.created_at } };
  }
  // Calculate pagination
  const take = limit + 1;
  const skip = cursor === undefined ? (page - 1) * limit : undefined;
  // Fetch data
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where:
      cursorInput !== undefined
        ? { ...whereInput, ...cursorInput }
        : whereInput,
    orderBy: orderByInput,
    ...(skip !== undefined && { skip }),
    take,
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  // Check if there's more data
  const hasMore = data.length > limit;
  const results = hasMore ? data.slice(0, limit) : data;
  // Calculate cursor for next page
  const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    results,
    EcommerceMallRefundRequestAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
