import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  // IRequest is empty, so we access query parameters from any-cast props.body
  const anyBody = props.body as any;
  // Extract pagination parameters with defaults
  const page = typeof anyBody.page === "number" ? anyBody.page : 1;
  const limit = typeof anyBody.limit === "number" ? anyBody.limit : 100;
  const skip = (page - 1) * limit;
  // Extract filtering parameters
  const whereClause: Prisma.shopping_mall_refund_requestsWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  // Filter by status if provided
  if (anyBody.status !== undefined && anyBody.status !== null) {
    whereClause.status = anyBody.status;
  }
  // Filter by date range for created_at - use Prisma DateTimeFilter format
  if (
    anyBody.createdAtFrom !== undefined ||
    anyBody.createdAtTo !== undefined
  ) {
    if (!whereClause.created_at) whereClause.created_at = {};
    if (anyBody.createdAtFrom !== undefined) {
      // Convert string to Date object (not string) for Prisma
      const dateString = anyBody.createdAtFrom;
      if (typeof dateString === "string") {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          whereClause.created_at.gte = date; // Direct Date object, no toISOStringSafe
        }
      }
    }
    if (anyBody.createdAtTo !== undefined) {
      const dateString = anyBody.createdAtTo;
      if (typeof dateString === "string") {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          whereClause.created_at.lte = date; // Direct Date object, no toISOStringSafe
        }
      }
    }
  }
  // Filter by reason keyword search if provided
  if (anyBody.reason !== undefined) {
    whereClause.reason = { contains: anyBody.reason };
  }
  // Query the database
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      customer: {
        select: { id: true, email: true, deleted_at: true },
      },
      orderItem: {
        select: {
          id: true,
          order_id: true,
          product_name: true,
          product_description: true,
          variant_sku: true,
          option_values: true,
          quantity: true,
          unit_price: true,
          status: true,
          created_at: true,
          updated_at: true,
          shop_name: true,
          category_name: true,
          thumbnail_image: true,
        },
      },
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where: whereClause,
  });
  // Transform results to summary format
  const summaryData = data.map((refund) => {
    const customer = refund.customer;
    const orderItem = refund.orderItem;
    const customerName = customer.deleted_at ? "deleted user" : customer.email;
    return {
      id: refund.id,
      status: refund.status,
      reason: refund.reason,
      created_at: toISOStringSafe(refund.created_at),
      customer_name: customerName,
      order_id: orderItem?.order_id || "",
      product_name: orderItem?.product_name || "",
      product_description: orderItem?.product_description || "",
      variant_sku: orderItem?.variant_sku || "",
      option_values: orderItem?.option_values || "{}",
      quantity: orderItem?.quantity || 0,
      unit_price: orderItem?.unit_price || 0,
      shop_name: orderItem?.shop_name || "",
      category_name: orderItem?.category_name || "",
      thumbnail_image: orderItem?.thumbnail_image || "",
    } satisfies IShoppingMallRefundRequest.ISummary;
  });
  // Return paginated response
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
