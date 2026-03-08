import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItemSnapshots(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    deleted_at: null,
    orderItem: {
      order: {
        customer_id: props.customer.id,
      },
    },
    ...(props.body.orderItemId && {
      order_item_id: props.body.orderItemId,
    }),
    ...(props.body.cancellationRequestId && {
      cancellation_request_id: props.body.cancellationRequestId,
    }),
    ...(props.body.refundRequestId && {
      refund_request_id: props.body.refundRequestId,
    }),
    ...(props.body.changedBySellerId && {
      changed_by_seller_id: props.body.changedBySellerId,
    }),
    ...(props.body.oldStatus !== undefined && {
      old_status: props.body.oldStatus,
    }),
    ...(props.body.newStatus !== undefined && {
      new_status: props.body.newStatus,
    }),
    ...(props.body.changeReason && {
      change_reason: {
        contains: props.body.changeReason,
        mode: "insensitive",
      },
    }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lt: props.body.createdAtTo,
      },
    }),
  };
  let orderByInput: Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput;
  if (props.body.sortBy === "oldStatus") {
    orderByInput = {
      old_status: props.body.sortOrder === "asc" ? "asc" : "desc",
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput;
  } else if (props.body.sortBy === "newStatus") {
    orderByInput = {
      new_status: props.body.sortOrder === "asc" ? "asc" : "desc",
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput;
  } else if (props.body.sortBy === "changedBySellerId") {
    orderByInput = {
      changed_by_seller_id: props.body.sortOrder === "asc" ? "asc" : "desc",
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput;
  } else {
    orderByInput = {
      created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput;
  }
  const data =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where: whereInput,
    },
  );
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  const transformedData = await Promise.all(
    data.map(EcommerceMallOrderItemSnapshotAtSummaryTransformer.transform),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
