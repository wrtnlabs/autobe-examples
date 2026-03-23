import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestsDashboard(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCancellationRequest.IDashboard> {
  const customerId = props.customer.id;
  // Query summary statistics sequentially
  const pendingCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_customer_id: customerId,
        status: "pending",
        deleted_at: null,
      },
    });
  const approvedCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_customer_id: customerId,
        status: "approved",
        deleted_at: null,
      },
    });
  const rejectedCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_customer_id: customerId,
        status: "rejected",
        deleted_at: null,
      },
    });
  const totalCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_customer_id: customerId,
        deleted_at: null,
      },
    });
  // Query recent cancellation requests
  const recentRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        shopping_mall_customer_id: customerId,
        deleted_at: null,
      },
      orderBy: {
        requested_at: "desc",
      },
      take: 20,
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  const transformedRequests = await ArrayUtil.asyncMap(
    recentRequests,
    ShoppingMallCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    summary: {
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount,
    } satisfies IShoppingMallCancellationRequest.IDashboard["summary"],
    recentRequests: transformedRequests,
  };
}
