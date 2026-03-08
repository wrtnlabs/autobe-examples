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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrderItemSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  let limit = props.body.limit ?? props.body.pageSize ?? 20;
  limit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    deleted_at: props.body.includeDeleted === true ? undefined : null,
    ...(props.body.orderItemId !== undefined && {
      order_item_id: props.body.orderItemId,
    }),
    ...(props.body.cancellationRequestId !== undefined && {
      cancellation_request_id: props.body.cancellationRequestId,
    }),
    ...(props.body.refundRequestId !== undefined && {
      refund_request_id: props.body.refundRequestId,
    }),
    ...(props.body.changedBySellerId !== undefined && {
      changed_by_seller_id: props.body.changedBySellerId,
    }),
    ...(props.body.oldStatus !== undefined && {
      old_status: props.body.oldStatus,
    }),
    ...(props.body.newStatus !== undefined && {
      new_status: props.body.newStatus,
    }),
    ...(props.body.changeReason !== undefined && {
      change_reason: { contains: props.body.changeReason },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: toISOStringSafe(new Date(props.body.createdAtFrom)),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lt: toISOStringSafe(new Date(props.body.createdAtTo)),
      },
    }),
  } satisfies Prisma.ecommerce_mall_order_item_snapshotsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput[] =
    props.body.sortBy !== undefined && props.body.sortOrder !== undefined
      ? props.body.sortBy === "createdAt"
        ? [{ created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }]
        : props.body.sortBy === "oldStatus"
          ? [{ old_status: props.body.sortOrder === "asc" ? "asc" : "desc" }]
          : props.body.sortBy === "newStatus"
            ? [{ new_status: props.body.sortOrder === "asc" ? "asc" : "desc" }]
            : props.body.sortBy === "changedBySellerId"
              ? [
                  {
                    changed_by_seller_id:
                      props.body.sortOrder === "asc" ? "asc" : "desc",
                  },
                ]
              : [{ created_at: "desc" }]
      : [{ created_at: "desc" }];
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
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
