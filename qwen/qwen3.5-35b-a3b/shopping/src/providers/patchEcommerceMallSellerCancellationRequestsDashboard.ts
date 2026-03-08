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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerCancellationRequestsDashboard(props: {
  seller: SellerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const pageSize = props.body.pageSize ?? 100;
  const take = Math.min(Math.max(limit || pageSize, 10), 100);
  const skip = (page - 1) * take;
  const whereInput = {
    deleted_at: null,
    orderItem: {
      product: {
        seller_id: props.seller.id,
      },
    },
    ...(props.body.requestStatus
      ? ({ request_status: props.body.requestStatus } satisfies {
          request_status: "pending" | "approved" | "rejected";
        })
      : {}),
    ...(props.body.createdFrom
      ? ({ created_at: { gte: new Date(props.body.createdFrom) } } satisfies {
          created_at: {
            gte: Date;
          };
        })
      : {}),
    ...(props.body.createdTo
      ? ({ created_at: { lte: new Date(props.body.createdTo) } } satisfies {
          created_at: {
            lte: Date;
          };
        })
      : {}),
    ...(props.body.search
      ? ({
          reason: { contains: props.body.search },
        } satisfies {
          reason: {
            contains: string;
          };
        })
      : {}),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const sortOrder = (props.body.sortOrder ?? "DESC") as "ASC" | "DESC";
  const orderByInput = (
    props.body.sort === "requestStatus"
      ? [{ request_status: sortOrder === "ASC" ? "asc" : ("desc" as const) }]
      : props.body.sort === "itemId"
        ? [{ order_item_id: sortOrder === "ASC" ? "asc" : ("desc" as const) }]
        : [{ created_at: sortOrder === "ASC" ? "asc" : ("desc" as const) }]
  ) satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput[];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take,
      orderBy: orderByInput,
      select: {
        id: true,
        customer_id: true,
        order_item_id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.max(Math.ceil(total / take), 0),
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      customer_id: record.customer_id as string & tags.Format<"uuid">,
      order_item_id: record.order_item_id as string & tags.Format<"uuid">,
      reason: record.reason,
      request_status: record.request_status as
        | "pending"
        | "approved"
        | "rejected",
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
    })),
  } satisfies IPageIEcommerceMallCancellationRequest.ISummary;
}
