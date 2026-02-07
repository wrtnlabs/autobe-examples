import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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

export async function patchShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  // Since IRequest is empty {} per schema, we cannot extract page/limit from body
  // According to the operation specification, these should be in the request body
  // This represents a fundamental schema-API mismatch
  // Use defaults for pagination as per spec: page=1, limit=100
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Current time converted to ISO string per system requirement
  const now = toISOStringSafe(new Date());
  // Build where clause per specification:
  // 'include only records where auto_approve_at > now() or status != 'pending''
  // This translates to: status != 'pending' OR auto_approve_at > now()
  const whereInput = {
    customer_id: props.customer.id,
    OR: [{ status: { not: "pending" } }, { auto_approve_at: { gt: now } }],
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  // Query with select to avoid include and get only needed fields
  // Join relations using relation names, not foreign keys
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        order_item_id: true,
        status: true,
        reason: true,
        created_at: true,
        auto_approve_at: true,
        orderItem: {
          select: {
            product_name: true,
            product_description: true,
            shop_name: true,
            variant_sku: true,
            quantity: true,
            unit_price: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereInput,
    },
  );
  // Transform each result using manual mapping
  const summaryData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    order_item_id: item.order_item_id as string & tags.Format<"uuid">,
    status: item.status,
    reason: item.reason,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    auto_approve_at: toISOStringSafe(item.auto_approve_at) as string &
      tags.Format<"date-time">,
    product_name: item.orderItem?.product_name ?? "",
    product_description: item.orderItem?.product_description ?? "",
    shop_name: item.orderItem?.shop_name ?? "",
    variant_sku: item.orderItem?.variant_sku ?? "",
    quantity: item.orderItem?.quantity ?? 0,
    unit_price: item.orderItem?.unit_price ?? 0,
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
