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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerRefundsRefundRequestIdItems(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequestItem.IRequest;
}): Promise<IPageIShoppingRefundRequestItem.ISummary> {
  // Validate that the refund request exists and belongs to the authenticated customer
  const parentRefund = await MyGlobal.prisma.shopping_refund_requests.findFirst(
    {
      where: {
        id: props.refundRequestId,
        shopping_actor_id: props.customer.id,
        actor_type: "customer",
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (!parentRefund) {
    throw new HttpException("Refund request not found or not accessible", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build base where filter
  const where: Record<string, any> = {
    shopping_refund_request_id: props.refundRequestId,
  };

  if (
    props.body.order_line_id !== undefined &&
    props.body.order_line_id !== null
  ) {
    where.shopping_order_line_id = props.body.order_line_id;
  }

  // Handle sku_code filter via join (get order_line ids matching the sku)
  if (props.body.sku_code !== undefined && props.body.sku_code !== null) {
    const matchingOrderLines =
      await MyGlobal.prisma.shopping_order_lines.findMany({
        where: {
          sku: {
            sku_code: props.body.sku_code,
          },
        },
        select: { id: true },
      });
    const filterOrderLineIds = matchingOrderLines.map((o) => o.id);
    if (filterOrderLineIds.length === 0) {
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
    where.shopping_order_line_id = { in: filterOrderLineIds };
  }

  // Query total count for pagination
  const total = await MyGlobal.prisma.shopping_refund_request_items.count({
    where,
  });

  // Find rows for this page
  const items = await MyGlobal.prisma.shopping_refund_request_items.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: offset,
    take: limit,
  });

  const result: IPageIShoppingRefundRequestItem.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages:
        total === 0
          ? 0
          : (Math.ceil(total / limit) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    },
    data: items.map((i) => ({
      id: i.id,
      shopping_refund_request_id: i.shopping_refund_request_id,
      order_line_id: i.shopping_order_line_id, // Map DB field to DTO field
      quantity: i.quantity,
      item_business_reason: i.item_business_reason ?? null,
      created_at: toISOStringSafe(i.created_at),
      updated_at: toISOStringSafe(i.updated_at),
    })),
  };

  return result;
}
