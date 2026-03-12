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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.requested_at_from !== undefined) {
    whereInput.requested_at = {
      gte: new Date(props.body.requested_at_from),
    };
  }
  if (props.body.requested_at_to !== undefined) {
    if (whereInput.requested_at !== undefined) {
      whereInput.requested_at = {
        gte: new Date(props.body.requested_at_from!),
        lte: new Date(props.body.requested_at_to),
      };
    } else {
      whereInput.requested_at = {
        lte: new Date(props.body.requested_at_to),
      };
    }
  }
  if (props.body.responded_at_from !== undefined) {
    whereInput.responded_at = {
      gte: new Date(props.body.responded_at_from),
    };
  }
  if (props.body.responded_at_to !== undefined) {
    if (whereInput.responded_at !== undefined) {
      whereInput.responded_at = {
        gte: new Date(props.body.responded_at_from!),
        lte: new Date(props.body.responded_at_to),
      };
    } else {
      whereInput.responded_at = {
        lte: new Date(props.body.responded_at_to),
      };
    }
  }
  const orderByInput: Prisma.shopping_mall_cancellation_requestsOrderByWithRelationInput =
    props.body.sortBy === "requested_at"
      ? { requested_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "responded_at"
        ? { responded_at: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" };
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereInput,
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
    } satisfies import("../api/structures/IPage").IPage.IPagination,
  };
}
