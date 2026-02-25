import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceCancellationRequest.IRequest;
}): Promise<IPageIEcommerceCancellationRequest.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput = {
    deleted_at: null,
    ecommerce_customer_id: props.customer.id,
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.seller_id && {
      ecommerce_seller_id: props.body.seller_id,
    }),
    ...(props.body.date_from && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      created_at: { lte: new Date(props.body.date_to) },
    }),
  } satisfies Prisma.ecommerce_cancellation_requestsWhereInput;
  // Handle status filtering if specified
  let statusFilteredData = null;
  if (props.body.status) {
    // Get cancellation request IDs that match the status filter
    const matchingRequestIds = await MyGlobal.prisma.$queryRaw<
      Array<{
        cancellation_request_id: string;
      }>
    >`
      SELECT DISTINCT cers.ecommerce_cancellation_request_id as cancellation_request_id
      FROM ecommerce_cancellation_request_statuses cers
      INNER JOIN (
        SELECT ecommerce_cancellation_request_id, MAX(created_at) as latest_ts
        FROM ecommerce_cancellation_request_statuses 
        WHERE ecommerce_cancellation_request_id IN (
          SELECT id FROM ecommerce_cancellation_requests 
          WHERE ecommerce_customer_id = ${props.customer.id} AND deleted_at IS NULL
        )
        GROUP BY ecommerce_cancellation_request_id
      ) latest ON cers.ecommerce_cancellation_request_id = latest.ecommerce_cancellation_request_id 
        AND cers.created_at = latest.latest_ts
      WHERE cers.status = ${props.body.status}
    `;
    const requestIds = matchingRequestIds.map((r) => r.cancellation_request_id);
    if (requestIds.length === 0) {
      return {
        data: [],
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
    statusFilteredData =
      await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
        where: { ...whereInput, id: { in: requestIds } },
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...EcommerceCancellationRequestAtSummaryTransformer.select(),
      });
  }
  const [data, total] = await Promise.all([
    statusFilteredData ||
      MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...EcommerceCancellationRequestAtSummaryTransformer.select(),
      }),
    props.body.status
      ? statusFilteredData
        ? statusFilteredData.length
        : 0
      : MyGlobal.prisma.ecommerce_cancellation_requests.count({
          where: whereInput,
        }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCancellationRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
