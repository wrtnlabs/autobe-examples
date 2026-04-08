import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrderItemsOrderItemIdCancellationRequests(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    order_item_id: props.orderItemId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.customerId !== undefined && {
      customer_id: props.body.customerId,
    }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
    ...((props.body.respondedAtFrom !== undefined ||
      props.body.respondedAtTo !== undefined) && {
      responded_at: {
        ...(props.body.respondedAtFrom !== undefined && {
          gte: new Date(props.body.respondedAtFrom),
        }),
        ...(props.body.respondedAtTo !== undefined && {
          lte: new Date(props.body.respondedAtTo),
        }),
        ...(props.body.respondedAtFrom === undefined &&
          props.body.respondedAtTo === undefined && { not: null }),
      },
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput = (() => {
    const sortBy = props.body.sortBy ?? "createdAt";
    const sortOrder = props.body.sortOrder ?? "desc";
    const orderDirection =
      sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
    if (sortBy === "createdAt") {
      return { created_at: orderDirection };
    } else if (sortBy === "updatedAt") {
      return { updated_at: orderDirection };
    } else {
      return { status: orderDirection };
    }
  })() satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCancellationRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
