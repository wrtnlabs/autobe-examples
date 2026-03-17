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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const { body } = props;
  // Build WHERE clause
  const where: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
  };
  // Apply entity filters
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }
  if (body.orderItemId !== undefined && body.orderItemId !== null) {
    where.order_item_id = body.orderItemId;
  }
  if (body.customerId !== undefined && body.customerId !== null) {
    where.customer_id = body.customerId;
  }
  if (body.sellerId !== undefined && body.sellerId !== null) {
    where.seller_id = body.sellerId;
  }
  // Track date filter presence for cursor handling
  const hasSubmittedAfter =
    body.submittedAfter !== undefined && body.submittedAfter !== null;
  const hasSubmittedBefore =
    body.submittedBefore !== undefined && body.submittedBefore !== null;
  const hasRespondedAfter =
    body.respondedAfter !== undefined && body.respondedAfter !== null;
  const hasRespondedBefore =
    body.respondedBefore !== undefined && body.respondedBefore !== null;
  // Build requested_at date range filter
  if (hasSubmittedAfter && hasSubmittedBefore) {
    where.requested_at = {
      gte: body.submittedAfter as string,
      lte: body.submittedBefore as string,
    };
  } else if (hasSubmittedAfter) {
    where.requested_at = {
      gte: body.submittedAfter as string,
    };
  } else if (hasSubmittedBefore) {
    where.requested_at = {
      lte: body.submittedBefore as string,
    };
  }
  // Build responded_at date range filter
  if (hasRespondedAfter && hasRespondedBefore) {
    where.responded_at = {
      gte: body.respondedAfter as string,
      lte: body.respondedBefore as string,
    };
  } else if (hasRespondedAfter) {
    where.responded_at = {
      gte: body.respondedAfter as string,
    };
  } else if (hasRespondedBefore) {
    where.responded_at = {
      lte: body.respondedBefore as string,
    };
  }
  // Text search filter
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.reason = {
      contains: body.search,
      mode: Prisma.QueryMode.insensitive,
    };
  }
  // Setup pagination and sorting
  const limit = body.limit ?? 20;
  const sortField = body.sortField ?? "submittedAt";
  const sortOrder = body.sortOrder ?? "desc";
  const orderBy: Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput =
    sortField === "respondedAt"
      ? { responded_at: sortOrder }
      : { requested_at: sortOrder };
  let skip: number | undefined;
  // Handle cursor-based pagination
  if (
    body.cursor !== undefined &&
    body.cursor !== null &&
    body.cursor.length > 0
  ) {
    try {
      const cursorData: {
        id: string;
      } = JSON.parse(Buffer.from(body.cursor, "base64").toString("utf-8"));
      const cursorRecord =
        await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
          where: { id: cursorData.id },
          select: { requested_at: true, responded_at: true },
        });
      if (cursorRecord !== null) {
        const isRespondedSort = sortField === "respondedAt";
        const cursorValue = isRespondedSort
          ? cursorRecord.responded_at
          : cursorRecord.requested_at;
        const comparisonOp = sortOrder === "asc" ? "gt" : "lt";
        if (cursorValue !== null) {
          // Rebuild date filter with cursor comparison while preserving existing range
          if (isRespondedSort) {
            where.responded_at = {
              gte: hasRespondedAfter
                ? (body.respondedAfter as string)
                : undefined,
              lte: hasRespondedBefore
                ? (body.respondedBefore as string)
                : undefined,
              [comparisonOp]: cursorValue,
            };
          } else {
            where.requested_at = {
              gte: hasSubmittedAfter
                ? (body.submittedAfter as string)
                : undefined,
              lte: hasSubmittedBefore
                ? (body.submittedBefore as string)
                : undefined,
              [comparisonOp]: cursorValue,
            };
          }
        }
      }
    } catch {
      // Invalid cursor, continue without cursor filtering
    }
  } else if (body.page !== undefined && body.page !== null && body.page > 0) {
    skip = (body.page - 1) * limit;
  }
  // Execute query with joins for related data
  const refundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        status: true,
        reason: true,
        requested_at: true,
        responded_at: true,
        order_item_id: true,
        orderItem: {
          select: {
            productSnapshot: {
              select: { name: true },
            },
          },
        },
        customer: {
          select: { email: true },
        },
        seller: {
          select: {
            profileSnapshots: {
              orderBy: { created_at: "desc" },
              take: 1,
              select: { shop_name: true },
            },
          },
        },
      },
    });
  // Count total matching records
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where,
  });
  const currentPage = body.page ?? 1;
  const totalPages = Math.ceil(total / limit);
  // Transform to DTO format
  const data: IEcommerceMallRefundRequest.ISummary[] = refundRequests.map(
    (refund: any) => ({
      id: refund.id,
      status: refund.status,
      reason: refund.reason,
      submittedAt: toISOStringSafe(refund.requested_at),
      respondedAt:
        refund.responded_at !== null
          ? toISOStringSafe(refund.responded_at)
          : null,
      hasResponse: refund.responded_at !== null,
      orderItemId: refund.order_item_id,
      productName:
        (refund as any).orderItem?.productSnapshot?.name ?? "Unknown Product",
      sellerShopName:
        (refund as any).seller?.profileSnapshots[0]?.shop_name ??
        "Unknown Shop",
      customerDisplayName:
        (refund as any).customer?.email ?? "Unknown Customer",
    }),
  );
  return {
    data,
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: totalPages,
    },
  };
}
