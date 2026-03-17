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
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.created_from !== null &&
    props.body.created_from !== undefined
  ) {
    createdAtFilter.gte = new Date(props.body.created_from);
  }
  if (props.body.created_to !== null && props.body.created_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_to);
  }
  const whereInput = {
    orderItem: {
      order: {
        shopping_mall_customer_id: props.customer.id,
      },
    },
    ...(props.body.status !== null &&
      props.body.status !== undefined && {
        status: props.body.status,
      }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.search !== null &&
      props.body.search !== undefined && {
        reason: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const orderByInput = (
    props.body.sort === "responded_at"
      ? {
          responded_at:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        }
      : {
          created_at:
            props.body.order === "asc" ? ("asc" as const) : ("desc" as const),
        }
  ) satisfies Prisma.shopping_mall_refund_requestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundRequestTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
