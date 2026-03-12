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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCancellationRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
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
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput =
    (() => {
      const sortField = props.body.sortBy ?? "requested_at";
      const sortOrder = props.body.sortOrder ?? "desc";
      switch (sortField) {
        case "requested_at":
          return { requested_at: sortOrder };
        case "responded_at":
          return { responded_at: sortOrder };
        case "created_at":
          return { created_at: sortOrder };
        default:
          return { requested_at: "desc" };
      }
    })() satisfies Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput;
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
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
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
    data: transformedData,
  };
}
