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

export async function getShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
}): Promise<IPageIShoppingMallRefundRequest> {
  // Extract pagination parameters with defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query refund requests with explicit field selection (NOT include)
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      auto_approval_deadline: true,
      shopping_mall_order_item_id: true,
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Transform data with proper date handling using toISOStringSafe and type-safe string formatting
  const transformedData: IShoppingMallRefundRequest[] = data.map((refund) => ({
    id: refund.id as string & tags.Format<"uuid">,
    reason: refund.reason,
    status: refund.status,
    created_at: toISOStringSafe(refund.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(refund.updated_at) as string &
      tags.Format<"date-time">,
    auto_approval_deadline: toISOStringSafe(
      refund.auto_approval_deadline,
    ) as string & tags.Format<"date-time">,
    shopping_mall_order_item_id: refund.shopping_mall_order_item_id as string &
      tags.Format<"uuid">,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
