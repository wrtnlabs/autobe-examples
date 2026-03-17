import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerDashboardRefundRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItemRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallOrderItemRefundRequest.ISummary> {
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with seller filter through join chain
  const whereInput: Prisma.ecommerce_mall_order_item_refund_requestsWhereInput =
    {
      deleted_at: null,
      // Filter by seller_id through join chain: refund_requests -> order_items -> product_variants -> products
      orderItem: {
        productVariant: {
          product: {
            seller_id: props.seller.id,
          },
        },
      },
      // Apply status filter if provided
      ...(props.body.status && {
        status: props.body.status,
      }),
      // Apply requested_at range filters if provided
      ...(props.body.requested_at_from || props.body.requested_at_to
        ? {
            requested_at: {
              ...(props.body.requested_at_from && {
                gte: new Date(props.body.requested_at_from),
              }),
              ...(props.body.requested_at_to && {
                lte: new Date(props.body.requested_at_to),
              }),
            },
          }
        : {}),
    };
  // Build order by clause
  const sortBy = props.body.sortBy ?? "requested_at";
  const order = props.body.order ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_order_item_refund_requestsOrderByWithRelationInput =
    sortBy === "days_since_delivery"
      ? { days_since_delivery: order }
      : { requested_at: order };
  // Execute query for data
  const data =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallOrderItemRefundRequestAtSummaryTransformer.select(),
    });
  // Execute count for total
  const total =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.count({
      where: whereInput,
    });
  // Transform records to DTO format
  const records = await ArrayUtil.asyncMap(
    data,
    EcommerceMallOrderItemRefundRequestAtSummaryTransformer.transform,
  );
  // Calculate pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: records,
  } satisfies IPageIEcommerceMallOrderItemRefundRequest.ISummary;
}
