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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderItemSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const actualPageSize = Math.min(Math.max(pageSize, 1), limit);
  const skip = (page - 1) * actualPageSize;
  const whereInput: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    changed_by_seller_id: props.seller.id,
  };
  if (props.body.orderItemId !== undefined) {
    whereInput.order_item_id = props.body.orderItemId;
  }
  if (props.body.cancellationRequestId !== undefined) {
    whereInput.cancellation_request_id = props.body.cancellationRequestId;
  }
  if (props.body.refundRequestId !== undefined) {
    whereInput.refund_request_id = props.body.refundRequestId;
  }
  if (props.body.oldStatus !== undefined) {
    whereInput.old_status = props.body.oldStatus;
  }
  if (props.body.newStatus !== undefined) {
    whereInput.new_status = props.body.newStatus;
  }
  if (props.body.changeReason !== undefined) {
    whereInput.change_reason = {
      contains: props.body.changeReason,
      mode: "insensitive",
    };
  }
  if (props.body.createdAtFrom !== undefined) {
    whereInput.created_at = { gte: new Date(props.body.createdAtFrom) };
  }
  if (props.body.createdAtTo !== undefined) {
    whereInput.created_at = {
      ...(whereInput.created_at as any),
      lt: new Date(props.body.createdAtTo),
    };
  }
  const orderByInput = (() => {
    const field = props.body.sortBy ?? "createdAt";
    const order = props.body.sortOrder ?? "desc";
    const fieldMap: Record<string, string> = {
      createdAt: "created_at",
      oldStatus: "old_status",
      newStatus: "new_status",
      changedBySellerId: "changed_by_seller_id",
    };
    const prismaField = fieldMap[field] ?? "created_at";
    return {
      [prismaField]: order === "asc" ? "asc" : "desc",
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsOrderByWithRelationInput;
  })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: actualPageSize,
      orderBy: orderByInput,
      ...EcommerceMallOrderItemSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: actualPageSize,
      records: total,
      pages: Math.ceil(total / actualPageSize),
    } satisfies IPage.IPagination,
  };
}
