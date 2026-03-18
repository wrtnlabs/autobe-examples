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
  const formatDateTime = (
    d: Date | null,
  ): (string & tags.Format<"date-time">) | null => {
    if (d === null) return null;
    const iso = toISOStringSafe(d);
    return typia.assert<string & tags.Format<"date-time">>(iso);
  };
  const where: Prisma.shopping_mall_snapshotsWhereInput = {
    deleted_at: null,
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
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    snapshotParties: {
      some: {
        can_view: true,
        deleted_at: null,
        party_type: "admin",
        party_id: props.admin.id,
      },
    },
  } satisfies Prisma.shopping_mall_snapshotsWhereInput;
  const orderBy = (() => {
    switch (props.body.sort) {
      case "created_at_asc":
        return { created_at: "asc" as const };
      case "created_at_desc":
        return { created_at: "desc" as const };
      case "updated_at_asc":
        return { updated_at: "asc" as const };
      case "updated_at_desc":
        return { updated_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.shopping_mall_snapshotsOrderByWithRelationInput;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
    MyGlobal.prisma.shopping_mall_snapshots.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        page,
      ),
      limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
      records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        total,
      ),
      pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        Math.ceil(total / limit),
      ),
    },
    data: rows.map((r) => ({
      id: typia.assert<string & tags.Format<"uuid">>(r.id),
      snapshot_code: r.snapshot_code,
      source_type: r.source_type,
      source_entity_id: typia.assert<string & tags.Format<"uuid">>(
        r.source_entity_id,
      ),
      source_seller_id: r.source_seller_id
        ? typia.assert<string & tags.Format<"uuid">>(r.source_seller_id)
        : null,
      source_order_id: r.source_order_id
        ? typia.assert<string & tags.Format<"uuid">>(r.source_order_id)
        : null,
      source_order_item_id: r.source_order_item_id
        ? typia.assert<string & tags.Format<"uuid">>(r.source_order_item_id)
        : null,
      source_review_id: r.source_review_id
        ? typia.assert<string & tags.Format<"uuid">>(r.source_review_id)
        : null,
      source_cancellation_request_id: r.source_cancellation_request_id
        ? typia.assert<string & tags.Format<"uuid">>(
            r.source_cancellation_request_id,
          )
        : null,
      source_refund_request_id: r.source_refund_request_id
        ? typia.assert<string & tags.Format<"uuid">>(r.source_refund_request_id)
        : null,
      created_by_member_id: r.created_by_member_id
        ? typia.assert<string & tags.Format<"uuid">>(r.created_by_member_id)
        : null,
      reason: r.reason,
      created_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(r.created_at),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(r.updated_at),
      ),
      deleted_at: formatDateTime(r.deleted_at),
    })),
  } satisfies IPageIShoppingMallSnapshot.ISummary;
}
