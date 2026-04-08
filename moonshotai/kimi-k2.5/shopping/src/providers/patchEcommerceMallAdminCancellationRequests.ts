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

export async function patchEcommerceMallAdminCancellationRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.orderItemId !== undefined && {
      order_item_id: props.body.orderItemId,
    }),
    ...(props.body.customerId !== undefined && {
      customer_id: props.body.customerId,
    }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined
          ? { gte: new Date(props.body.createdAtFrom) }
          : {}),
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.respondedAtFrom !== undefined && {
      responded_at: { gte: new Date(props.body.respondedAtFrom) },
    }),
    ...(props.body.respondedAtTo !== undefined && {
      responded_at: {
        ...(props.body.respondedAtFrom !== undefined
          ? { gte: new Date(props.body.respondedAtFrom) }
          : {}),
        lte: new Date(props.body.respondedAtTo),
      },
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput = (
    props.body.sortBy === "createdAt"
      ? { created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
      : props.body.sortBy === "updatedAt"
        ? { updated_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
        : props.body.sortBy === "status"
          ? { status: (props.body.sortOrder ?? "asc") as "asc" | "desc" }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
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
