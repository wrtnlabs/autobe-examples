import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IPageIShoppingMallSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtBound = (() => {
    const gte = props.body.createdAtFrom;
    const lte = props.body.createdAtTo;
    if (gte === undefined && lte === undefined) return undefined;
    return {
      ...(gte !== undefined && { gte }),
      ...(lte !== undefined && { lte }),
    };
  })();
  const where = {
    ...(props.body.sourceType !== undefined && {
      source_type: props.body.sourceType,
    }),
    ...(props.body.sourceEntityId !== undefined && {
      source_entity_id: props.body.sourceEntityId,
    }),
    ...(props.body.sourceSellerId !== undefined && {
      source_seller_id: props.body.sourceSellerId,
    }),
    ...(props.body.sourceOrderId !== undefined && {
      source_order_id: props.body.sourceOrderId,
    }),
    ...(props.body.sourceOrderItemId !== undefined && {
      source_order_item_id: props.body.sourceOrderItemId,
    }),
    ...(props.body.sourceReviewId !== undefined && {
      source_review_id: props.body.sourceReviewId,
    }),
    ...(props.body.sourceCancellationRequestId !== undefined && {
      source_cancellation_request_id: props.body.sourceCancellationRequestId,
    }),
    ...(props.body.sourceRefundRequestId !== undefined && {
      source_refund_request_id: props.body.sourceRefundRequestId,
    }),
    ...(props.body.createdByMemberId !== undefined && {
      created_by_member_id: props.body.createdByMemberId,
    }),
    ...(createdAtBound !== undefined && { created_at: createdAtBound }),
  };
  const orderBy = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "created_at_desc"
        ? { created_at: "desc" as const }
        : props.body.sort === "snapshot_code_asc"
          ? { snapshot_code: "asc" as const }
          : props.body.sort === "snapshot_code_desc"
            ? { snapshot_code: "desc" as const }
            : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_snapshotsOrderByWithRelationInput;
  const partyWhere = {
    can_view: true,
    deleted_at: null,
    party_type: "admin",
    party_id: props.admin.id,
  };
  const visibilityWhere = {
    snapshotParties: { some: partyWhere },
  };
  const [records, rows] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_snapshots.count({
      where: {
        ...(where as Prisma.shopping_mall_snapshotsWhereInput),
        ...(visibilityWhere as Prisma.shopping_mall_snapshotsWhereInput),
      },
    }),
    MyGlobal.prisma.shopping_mall_snapshots.findMany({
      where: {
        ...(where as Prisma.shopping_mall_snapshotsWhereInput),
        ...(visibilityWhere as Prisma.shopping_mall_snapshotsWhereInput),
      },
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        snapshot_code: true,
        source_type: true,
        source_entity_id: true,
        source_seller_id: true,
        source_order_id: true,
        source_order_item_id: true,
        source_review_id: true,
        source_cancellation_request_id: true,
        source_refund_request_id: true,
        created_by_member_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
    data: rows.map(
      (s) =>
        ({
          id: s.id,
          snapshot_code: s.snapshot_code,
          source_type: s.source_type,
          source_entity_id: s.source_entity_id,
          source_seller_id: s.source_seller_id,
          source_order_id: s.source_order_id,
          source_order_item_id: s.source_order_item_id,
          source_review_id: s.source_review_id,
          source_cancellation_request_id: s.source_cancellation_request_id,
          source_refund_request_id: s.source_refund_request_id,
          created_by_member_id: s.created_by_member_id,
          reason: s.reason,
          created_at: toISOStringSafe(s.created_at),
          updated_at: toISOStringSafe(s.updated_at),
          deleted_at:
            s.deleted_at === null ? null : toISOStringSafe(s.deleted_at),
        }) satisfies IShoppingMallSnapshot.ISummary,
    ),
  };
}
