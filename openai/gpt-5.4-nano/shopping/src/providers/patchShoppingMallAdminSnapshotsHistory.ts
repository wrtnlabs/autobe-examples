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

export async function patchShoppingMallAdminSnapshotsHistory(props: {
  admin: AdminPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IPageIShoppingMallSnapshot.ISummary> {
  const page =
    props.body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    props.body.limit ??
    (20 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>);
  const skip = (page - 1) * limit;
  const createdAtFilter = (() => {
    if (
      props.body.createdAtFrom === undefined &&
      props.body.createdAtTo === undefined
    ) {
      return undefined;
    }
    const range: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};
    if (props.body.createdAtFrom !== undefined) {
      range.gte = props.body.createdAtFrom;
    }
    if (props.body.createdAtTo !== undefined) {
      range.lte = props.body.createdAtTo;
    }
    return range;
  })();
  const whereVisible = {
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
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    snapshotParties: {
      some: {
        party_type: "admin",
        party_id: props.admin.id,
        can_view: true,
        deleted_at: null,
      },
    },
  } satisfies Prisma.shopping_mall_snapshotsWhereInput;
  const orderBy = (() => {
    switch (props.body.sort) {
      case "created_at_asc":
        return {
          created_at: "asc" as const,
        } satisfies Prisma.shopping_mall_snapshotsOrderByWithRelationInput;
      case "created_at_desc":
        return {
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_snapshotsOrderByWithRelationInput;
      default:
        return {
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_snapshotsOrderByWithRelationInput;
    }
  })();
  const items = await MyGlobal.prisma.shopping_mall_snapshots.findMany({
    where: whereVisible,
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
  });
  const total = await MyGlobal.prisma.shopping_mall_snapshots.count({
    where: whereVisible,
  });
  return {
    data: items.map((s) => ({
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
      deleted_at: s.deleted_at === null ? null : toISOStringSafe(s.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
