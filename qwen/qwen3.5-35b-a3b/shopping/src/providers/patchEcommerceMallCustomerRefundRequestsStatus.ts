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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequestsStatus(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    deleted_at: null,
    orderItem: {
      order: {
        customer_id: props.customer.id,
      },
    },
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        request_status: props.body.status,
      }),
    ...(props.body.createdAfter !== undefined &&
      props.body.createdAfter !== null && {
        created_at: {
          gte: props.body.createdAfter as string,
        },
      }),
    ...(props.body.createdBefore !== undefined &&
      props.body.createdBefore !== null && {
        created_at: {
          lte: props.body.createdBefore as string,
        },
      }),
  };
  const orderByInput = (
    props.body.sortBy === "requestStatus"
      ? { request_status: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
      : { created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      orderItem: {
        select: {
          id: true,
          item_status: true,
          quantity: true,
          unit_price: true,
          product_snapshot: true,
          variant_snapshot: true,
          seller_profile_snapshot: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereConditions,
  });
  const transformedData: IEcommerceMallRefundRequest.ISummary[] =
    await ArrayUtil.asyncMap(data, async (refund) => {
      const orderItem: IEcommerceMallOrderItem.ISummary = {
        id: refund.orderItem.id as string & tags.Format<"uuid">,
        item_status: refund.orderItem.item_status,
        quantity: refund.orderItem.quantity,
        unit_price: refund.orderItem.unit_price,
        product_snapshot: refund.orderItem
          .product_snapshot as unknown as Record<string, string>,
        variant_snapshot: refund.orderItem
          .variant_snapshot as unknown as Record<string, string>,
        seller_profile_snapshot: refund.orderItem
          .seller_profile_snapshot as unknown as Record<string, string>,
        created_at: toISOStringSafe(refund.orderItem.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(refund.orderItem.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at:
          refund.orderItem.deleted_at === null
            ? null
            : (toISOStringSafe(refund.orderItem.deleted_at) as string &
                tags.Format<"date-time">),
      };
      return {
        id: refund.id as string & tags.Format<"uuid">,
        orderItem,
        reason: refund.reason,
        requestStatus: refund.request_status as
          | "pending"
          | "approved"
          | "rejected",
        createdAt: toISOStringSafe(refund.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(refund.updated_at) as string &
          tags.Format<"date-time">,
      };
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallRefundRequest.ISummary;
}
