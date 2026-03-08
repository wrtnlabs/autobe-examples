import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function patchShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with customer isolation
  const whereInput = {
    // Filter by customer through order_items -> orders
    orderItem: {
      order: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
    // Status filter (exact match or array contains)
    ...(props.body.status && {
      status: Array.isArray(props.body.status)
        ? { in: props.body.status }
        : props.body.status,
    }),
    // Seller filter
    ...(props.body.shopping_mall_seller_id && {
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
    }),
    // Order item filter
    ...(props.body.shopping_mall_order_item_id && {
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
    }),
    // Created at range filter (combine gte and lte)
    ...((props.body.created_at_from || props.body.created_at_to) && {
      created_at: {
        ...(props.body.created_at_from && {
          gte: new Date(props.body.created_at_from),
        }),
        ...(props.body.created_at_to && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
    // Responded at range filter (null-safe, combine gte and lte)
    ...((props.body.responded_at_from || props.body.responded_at_to) && {
      responded_at: {
        ...(props.body.responded_at_from && {
          gte: new Date(props.body.responded_at_from),
        }),
        ...(props.body.responded_at_to && {
          lte: new Date(props.body.responded_at_to),
        }),
      },
    }),
    // Reason text search (partial match, case-insensitive)
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  // Query with pagination (sequential: findMany first, then count)
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereInput,
    },
  );
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
