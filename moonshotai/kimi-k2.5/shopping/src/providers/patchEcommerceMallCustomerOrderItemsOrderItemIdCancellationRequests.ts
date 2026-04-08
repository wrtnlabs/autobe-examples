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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItemsOrderItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  // Verify order item belongs to customer
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order: {
        customer_id: props.customer.id,
      },
    },
    select: { id: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 403);
  }
  // Build where clause
  const where: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    order_item_id: props.orderItemId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.respondedAtFrom !== undefined && {
      responded_at: { gte: new Date(props.body.respondedAtFrom) },
    }),
    ...(props.body.respondedAtTo !== undefined && {
      responded_at: { lte: new Date(props.body.respondedAtTo) },
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build order by
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const sortByStr = sortBy as string;
  const orderBy: Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput =
    sortByStr === "respondedAt"
      ? { responded_at: sortOrder }
      : sortByStr === "updatedAt"
        ? { updated_at: sortOrder }
        : sortByStr === "status"
          ? { status: sortOrder }
          : { created_at: sortOrder };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({ where }),
  ]);
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
