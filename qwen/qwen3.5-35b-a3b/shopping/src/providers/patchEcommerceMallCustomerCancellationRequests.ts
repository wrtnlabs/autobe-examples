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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
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
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput = (() => {
    const sort = props.body.sort ?? "created_at";
    const direction = (props.body.direction as "asc" | "desc") ?? "desc";
    const sortField: "created_at" | "status" =
      sort === "created_at" ? "created_at" : "status";
    return {
      [sortField]: direction,
    } satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (
        item,
      ): Promise<{
        id: string;
        status: string;
        reason: string;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
        customer: IEcommerceMallCustomer.ISummary;
        orderItem: IEcommerceMallOrderItem.ISummary;
      }> => ({
        id: item.id,
        status: item.status,
        reason: item.reason,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
        customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
          item.customer,
        ),
        orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
          item.orderItem,
        ),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallCancellationRequest.ISummary;
}
