import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
  const limit = Math.min(props.body.limit ?? 50, 50);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.orderItemId !== undefined && {
      order_item_id: props.body.orderItemId,
    }),
    ...(props.body.status !== undefined && {
      request_status: props.body.status,
    }),
    ...(props.body.startDate !== undefined && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput =
    ((): Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput => {
      const sortBy = props.body.sortBy;
      const sortOrder = props.body.sortOrder ?? "desc";
      if (sortBy === "requestStatus") {
        return { request_status: sortOrder };
      }
      if (sortBy === "reason") {
        return { reason: sortOrder };
      }
      if (sortBy === "updatedAt") {
        return { updated_at: sortOrder };
      }
      return { created_at: sortOrder };
    })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
