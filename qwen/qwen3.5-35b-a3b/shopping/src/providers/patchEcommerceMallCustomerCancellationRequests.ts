import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
  const limit = props.body.limit ?? 20;
  const maxLimit = 100;
  const normalizedLimit = Math.min(limit, maxLimit);
  const skip = (page - 1) * normalizedLimit;
  const whereInput: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.order_item_id !== undefined && {
      order_item_id: props.body.order_item_id,
    }),
    ...(props.body.from !== undefined && {
      created_at: { gte: new Date(props.body.from) },
    }),
    ...(props.body.to !== undefined && {
      created_at: { lte: new Date(props.body.to) },
    }),
  };
  const orderByInput = (
    props.body.sort === "status"
      ? { status: props.body.direction ?? "desc" }
      : { created_at: props.body.direction ?? "desc" }
  ) as Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      orderBy: [orderByInput],
      skip,
      take: normalizedLimit,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: normalizedLimit,
      records: total,
      pages: Math.ceil(total / normalizedLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCancellationRequestAtSummaryTransformer.transform,
    ),
  };
}
