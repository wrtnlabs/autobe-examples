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
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSellerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  // Verify seller exists and is approved (seller table uses same ID as customer)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.customer.id,
      approval_status: "approved",
      banned: false,
    },
  });
  if (seller === null) {
    throw new HttpException("You are not an approved seller", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.shopping_mall_cancellation_requestsWhereInput =
    {
      orderItem: {
        shopping_mall_seller_id: seller.id,
      },
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.created_at_from !== undefined && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
      ...(props.body.created_at_to !== undefined && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
      ...(props.body.responded_at_from !== undefined && {
        responded_at: {
          gte: new Date(props.body.responded_at_from),
        },
      }),
      ...(props.body.responded_at_to !== undefined && {
        responded_at: {
          lte: new Date(props.body.responded_at_to),
        },
      }),
    };
  // Merge created_at conditions if both from and to are specified
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
  ) {
    whereConditions.created_at = {
      gte: new Date(props.body.created_at_from),
      lte: new Date(props.body.created_at_to),
    };
  }
  // Merge responded_at conditions if both from and to are specified
  if (
    props.body.responded_at_from !== undefined &&
    props.body.responded_at_to !== undefined
  ) {
    whereConditions.responded_at = {
      gte: new Date(props.body.responded_at_from),
      lte: new Date(props.body.responded_at_to),
    };
  }
  // Query with transformer select
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereConditions,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
