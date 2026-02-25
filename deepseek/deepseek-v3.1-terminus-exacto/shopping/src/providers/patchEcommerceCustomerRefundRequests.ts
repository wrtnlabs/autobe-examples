import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestAtSummaryTransformer } from "../transformers/EcommerceRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with customer-specific filtering
  const whereInputBase = {
    ecommerce_customer_id: props.customer.id,
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.requested_at_start && {
      requested_at: {
        gte: new Date(props.body.requested_at_start),
      },
    }),
    ...(props.body.requested_at_end && {
      requested_at: {
        lte: new Date(props.body.requested_at_end),
      },
    }),
    deleted_at: null,
  } satisfies Prisma.ecommerce_refund_requestsWhereInput;
  // For status filtering, use a simpler approach: get all records and filter client-side
  // This avoids complex Prisma subqueries that cause type issues
  const baseData = await MyGlobal.prisma.ecommerce_refund_requests.findMany({
    where: whereInputBase,
    skip,
    take: limit,
    orderBy: { requested_at: "desc" as const },
    include: {
      customer: true,
      seller: true,
      statusHistories: {
        orderBy: { created_at: "desc" as const },
      },
      orderItem: true,
      inventoryRestorations: true,
      modificationSnapshots: true,
      refundResponses: true,
    },
  });
  // Filter by status client-side if needed
  const filteredData =
    props.body.status !== null && props.body.status !== undefined
      ? baseData.filter(
          (request) =>
            request.statusHistories.length > 0 &&
            request.statusHistories[0]?.status === props.body.status,
        )
      : baseData;
  const total = await MyGlobal.prisma.ecommerce_refund_requests.count({
    where: whereInputBase,
  });
  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: filteredData.length satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(filteredData, (item) =>
      EcommerceRefundRequestAtSummaryTransformer.transform(item),
    ),
  } satisfies IPageIEcommerceRefundRequest.ISummary;
}
