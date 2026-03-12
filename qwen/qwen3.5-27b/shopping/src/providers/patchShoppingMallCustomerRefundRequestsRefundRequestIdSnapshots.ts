import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallRefundSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundSnapshot.ISummary> {
  // Verify refund request exists and belongs to customer
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // Apply pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots
  const data = await MyGlobal.prisma.shopping_mall_refund_snapshots.findMany({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: props.body.sortOrder ?? "desc",
    },
    ...ShoppingMallRefundSnapshotAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_refund_snapshots.count({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
