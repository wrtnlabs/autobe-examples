import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
  // Build base where clause with authorization filter
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  // Add status filter if provided
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Add order item filter if provided
  if (props.body.orderItemId !== undefined) {
    whereInput.ecommerce_mall_order_item_id = props.body.orderItemId;
  }
  // Add seller filter via nested query
  if (props.body.sellerIds !== undefined && props.body.sellerIds.length > 0) {
    whereInput.ecommerce_mall_order_item_id = {
      in: (
        await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
          where: {
            seller_snapshot_id: {
              in: props.body.sellerIds.map(
                (sellerId: string & tags.Format<"uuid">) => sellerId,
              ),
            },
          },
          select: { id: true },
        })
      ).map((item) => item.id),
    };
  }
  // Add customer IDs filter if provided
  if (
    props.body.customerIds !== undefined &&
    props.body.customerIds.length > 0
  ) {
    whereInput.ecommerce_mall_customer_id = {
      in: props.body.customerIds,
    };
  }
  // Add reason keywords filter (case-insensitive partial match)
  if (props.body.reasonKeywords !== undefined) {
    whereInput.reason = {
      contains: props.body.reasonKeywords,
      mode: "insensitive",
    };
  }
  // Add date range filter - using created_at as submitted_at
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.startDate !== undefined) {
      dateFilter.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate !== undefined) {
      dateFilter.lte = new Date(props.body.endDate);
    }
    whereInput.created_at = dateFilter;
  }
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build orderBy based on sortBy parameter
  const orderByInput: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput[] =
    (() => {
      if (props.body.sortBy === "status") {
        return [
          {
            status: (props.body.sortOrder ?? "desc") as "asc" | "desc",
          },
        ];
      }
      if (props.body.sortBy === "updatedAt") {
        return [
          {
            updated_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
          },
        ];
      }
      if (props.body.sortBy === "refundAmount") {
        return [
          {
            orderItem: {
              total_price: (props.body.sortOrder ?? "desc") as "asc" | "desc",
            },
          },
        ];
      }
      // Default: sort by created_at descending
      return [
        {
          created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
        },
      ];
    })();
  // Build minAmount filter via nested query
  if (props.body.minAmount !== undefined) {
    const matchingOrderItemIds =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: {
          total_price: {
            gte: props.body.minAmount,
          },
        },
        select: { id: true },
      });
    if (matchingOrderItemIds.length > 0) {
      whereInput.ecommerce_mall_order_item_id = {
        in: matchingOrderItemIds.map((item) => item.id),
      };
    } else {
      // No matching items, return empty result
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
  }
  // Build maxAmount filter via nested query
  if (props.body.maxAmount !== undefined) {
    const matchingOrderItemIds =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: {
          total_price: {
            lte: props.body.maxAmount,
          },
        },
        select: { id: true },
      });
    if (matchingOrderItemIds.length > 0) {
      whereInput.ecommerce_mall_order_item_id = {
        in: matchingOrderItemIds.map((item) => item.id),
      };
    } else {
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
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestAtSummaryTransformer.transform,
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
