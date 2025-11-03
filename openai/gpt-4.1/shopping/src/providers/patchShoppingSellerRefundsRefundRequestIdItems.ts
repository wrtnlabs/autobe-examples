import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { IPageIShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequestItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerRefundsRefundRequestIdItems(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequestItem.IRequest;
}): Promise<IPageIShoppingRefundRequestItem.ISummary> {
  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 20;
  const offset = (page - 1) * limit;

  // 1. Query relevant refund items for this refund request (must be for order lines owned by this seller)
  // Also support sku_code/order_line_id/status filtering (sku_code requires join to order_lines+skus)

  // First, gather all order line IDs for this seller
  const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: { shopping_seller_id: props.seller.id },
    select: {
      id: true,
      sku: { select: { sku_code: true } },
    },
  });
  const sellerOrderLineIds = orderLines.map((l) => l.id);
  if (sellerOrderLineIds.length === 0) {
    // Seller is not related to this refund request (no order lines owned)
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Optional filter: by sku_code
  let skuFilteredLineIds: string[] | null = null;
  if (props.body.sku_code !== undefined) {
    skuFilteredLineIds = orderLines
      .filter((ol) => ol.sku && ol.sku.sku_code === props.body.sku_code)
      .map((ol) => ol.id);
    // If no order lines with this sku_code for seller, can only return empty
    if (skuFilteredLineIds.length === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Build where clause for refund items
  const where = {
    shopping_refund_request_id: props.refundRequestId,
    shopping_order_line_id: {
      in:
        skuFilteredLineIds !== null
          ? skuFilteredLineIds
          : props.body.order_line_id !== undefined
            ? [props.body.order_line_id]
            : sellerOrderLineIds,
    },
  };

  // 2. Query matching refund items with pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_refund_request_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_order_line_id: true,
        quantity: true,
        item_business_reason: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_refund_request_items.count({ where }),
  ]);

  const data = rows.map((item) => {
    const summary: IShoppingRefundRequestItem.ISummary = {
      id: item.id,
      shopping_refund_request_id: item.shopping_refund_request_id,
      order_line_id: item.shopping_order_line_id,
      quantity: item.quantity,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    };
    if (
      item.item_business_reason !== undefined &&
      item.item_business_reason !== null
    ) {
      summary.item_business_reason = item.item_business_reason;
    }
    return summary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data,
  };
}
