import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerCancellationRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    // Authorization: seller can only see their own requests
    seller_id: props.seller.id,
    // Optional status filter
    ...(props.body.status && { status: props.body.status }),
    // Optional orderItemId filter
    ...(props.body.orderItemId && { order_item_id: props.body.orderItemId }),
    // Optional customerId filter
    ...(props.body.customerId && { customer_id: props.body.customerId }),
    // Optional createdAt date range
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    // Optional respondedAt date range
    ...(props.body.respondedAtFrom || props.body.respondedAtTo
      ? {
          responded_at: {
            ...(props.body.respondedAtFrom && {
              gte: new Date(props.body.respondedAtFrom),
            }),
            ...(props.body.respondedAtTo && {
              lte: new Date(props.body.respondedAtTo),
            }),
          },
        }
      : {}),
    // Optional search on reason
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  // Build order by clause
  const sortField = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput =
    {
      ...(sortField === "createdAt" && { created_at: sortOrder }),
      ...(sortField === "updatedAt" && { updated_at: sortOrder }),
      ...(sortField === "status" && { status: sortOrder }),
    } satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  // Query data and count sequentially
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCancellationRequestAtSummaryTransformer.transform,
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
