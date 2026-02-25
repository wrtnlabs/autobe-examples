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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerCancellationRequestsPending(props: {
  seller: SellerPayload;
  body: IEcommerceCancellationRequest.IRequest;
}): Promise<IPageIEcommerceCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Calculate 7-day window using ISO string manipulation
  const now = toISOStringSafe(new Date());
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  // Get cancellation request IDs that have pending status within 7 days
  const pendingRequestIds =
    await MyGlobal.prisma.ecommerce_cancellation_request_statuses.findMany({
      where: {
        status: "pending",
        created_at: {
          gte: new Date(sevenDaysAgo),
          lte: new Date(now),
        },
      },
      select: {
        ecommerce_cancellation_request_id: true,
      },
      distinct: ["ecommerce_cancellation_request_id"],
    });
  const pendingRequestIdList = pendingRequestIds.map(
    (r) => r.ecommerce_cancellation_request_id,
  );
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_cancellation_requestsWhereInput = {
    id: { in: pendingRequestIdList },
    seller: { id: props.seller.id },
    deleted_at: null,
  };
  // Apply search filter using trigram matching
  if (props.body.search) {
    (whereInput as any).reason = { contains: props.body.search };
  }
  // Apply customer filter
  if (props.body.customer_id) {
    (whereInput as any).customer = { id: props.body.customer_id };
  }
  // Apply date range filters
  if (props.body.date_from) {
    (whereInput as any).created_at = {
      ...(whereInput as any).created_at,
      gte: new Date(props.body.date_from),
    };
  }
  if (props.body.date_to) {
    (whereInput as any).created_at = {
      ...(whereInput as any).created_at,
      lte: new Date(props.body.date_to),
    };
  }
  // Fetch paginated data
  const data = await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    ...EcommerceCancellationRequestAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_cancellation_requests.count({
    where: whereInput,
  });
  // Transform results safely
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
