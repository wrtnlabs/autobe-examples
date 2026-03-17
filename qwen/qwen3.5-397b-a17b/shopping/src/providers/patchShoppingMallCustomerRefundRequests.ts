import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "../transformers/ShoppingMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sortField = props.body.sort?.split(",")[0] ?? "requested_at";
  const sortDirection = (props.body.sort?.split(",")[1] ?? "desc") as
    | "asc"
    | "desc";
  const whereInput: Prisma.shopping_mall_refund_requestsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.requestedAtFrom && {
      requested_at: {
        gte: new Date(props.body.requestedAtFrom),
      },
    }),
    ...(props.body.requestedAtTo && {
      requested_at: {
        lte: new Date(props.body.requestedAtTo),
      },
    }),
    ...(props.body.deliveredAtFrom && {
      delivered_at: {
        gte: new Date(props.body.deliveredAtFrom),
      },
    }),
    ...(props.body.deliveredAtTo && {
      delivered_at: {
        lte: new Date(props.body.deliveredAtTo),
      },
    }),
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const orderByInput =
    sortField === "delivered_at"
      ? { delivered_at: sortDirection }
      : ({
          requested_at: sortDirection,
        } satisfies Prisma.shopping_mall_refund_requestsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallRefundRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
