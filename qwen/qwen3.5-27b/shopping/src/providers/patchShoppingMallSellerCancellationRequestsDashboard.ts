import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerCancellationRequestsDashboard(props: {
  seller: SellerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    orderItem: {
      shopping_mall_seller_id: props.seller.id,
    },
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.requested_at_from && {
      requested_at: {
        gte: new Date(props.body.requested_at_from),
      },
    }),
    ...(props.body.requested_at_to && {
      requested_at: {
        lte: new Date(props.body.requested_at_to),
      },
    }),
    ...(props.body.responded_at_from && {
      responded_at: {
        gte: new Date(props.body.responded_at_from),
      },
    }),
    ...(props.body.responded_at_to && {
      responded_at: {
        lte: new Date(props.body.responded_at_to),
      },
    }),
  };
  // Build orderBy
  const orderByInput: Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sortBy ?? "requested_at";
      const sortOrder = props.body.sortOrder ?? "desc";
      return {
        [sortBy]: sortOrder,
      };
    })();
  // Fetch data
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereInput,
    },
  );
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
