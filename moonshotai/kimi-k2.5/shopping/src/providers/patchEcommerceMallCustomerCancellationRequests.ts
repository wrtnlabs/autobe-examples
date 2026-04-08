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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtCondition: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAtFrom !== undefined) {
    createdAtCondition.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined) {
    createdAtCondition.lte = new Date(props.body.createdAtTo);
  }
  const respondedAtCondition: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.respondedAtFrom !== undefined) {
    respondedAtCondition.gte = new Date(props.body.respondedAtFrom);
  }
  if (props.body.respondedAtTo !== undefined) {
    respondedAtCondition.lte = new Date(props.body.respondedAtTo);
  }
  const where: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.orderItemId !== undefined && {
      order_item_id: props.body.orderItemId,
    }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(Object.keys(createdAtCondition).length > 0 && {
      created_at: createdAtCondition,
    }),
    ...(Object.keys(respondedAtCondition).length > 0 && {
      responded_at: respondedAtCondition,
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  const orderByFieldMap = {
    createdAt: "created_at" as const,
    updatedAt: "updated_at" as const,
    status: "status" as const,
  };
  const orderBy: Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput =
    {
      [orderByFieldMap[props.body.sortBy ?? "createdAt"]]:
        props.body.sortOrder ?? "desc",
    };
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({ where });
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
