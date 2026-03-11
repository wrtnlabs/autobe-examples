import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
    orderItem: {
      order: {
        customer_id: props.customer.id,
      },
    },
    ...(props.body.status != null && {
      request_status: props.body.status,
    }),
    ...(props.body.createdAfter !== undefined &&
      props.body.createdAfter !== null && {
        created_at: { gte: new Date(props.body.createdAfter) },
      }),
    ...(props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null && {
        created_at: { lte: new Date(props.body.createdBefore) },
      }),
  } satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  const orderByInput = (
    props.body.sortBy === "createdAt"
      ? {
          created_at:
            props.body.sortOrder === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : props.body.sortBy === "requestStatus"
        ? {
            request_status:
              props.body.sortOrder === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          }
        : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallRefundRequest;
}
