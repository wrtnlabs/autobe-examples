import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const safeLimit = Math.min(Math.max(pageSize, limit), 100);
  const skip = (page - 1) * safeLimit;
  const whereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.requestStatus !== undefined && {
      request_status: props.body.requestStatus,
    }),
    ...(props.body.createdFrom !== undefined && {
      created_at: { gte: props.body.createdFrom },
    }),
    ...(props.body.createdTo !== undefined && {
      created_at: { lte: props.body.createdTo },
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const orderByInput = (
    props.body.sort === "createdAt"
      ? { created_at: props.body.sortOrder === "ASC" ? "asc" : "desc" }
      : props.body.sort === "updatedAt"
        ? { updated_at: props.body.sortOrder === "ASC" ? "asc" : "desc" }
        : props.body.sort === "requestStatus"
          ? { request_status: props.body.sortOrder === "ASC" ? "asc" : "desc" }
          : props.body.sort === "itemId"
            ? { order_item_id: props.body.sortOrder === "ASC" ? "asc" : "desc" }
            : { created_at: "desc" }
  ) satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: safeLimit,
      select: {
        id: true,
        customer_id: true,
        order_item_id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      customer_id: record.customer_id,
      order_item_id: record.order_item_id,
      reason: record.reason,
      request_status: typia.assert<"pending" | "approved" | "rejected">(
        record.request_status,
      ),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })) satisfies IEcommerceMallCancellationRequest.ISummary[],
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  };
}
