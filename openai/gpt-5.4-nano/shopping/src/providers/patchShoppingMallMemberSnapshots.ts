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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberSnapshots(props: {
  member: MemberPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IPageIShoppingMallSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
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
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom as any),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo as any),
            }),
          },
        }
      : {}),
    snapshotParties: {
      some: {
        can_view: true,
        party_type: "owner",
        party_id: props.member.id,
        deleted_at: null,
      },
    },
  };
  const orderBy =
    (props.body.sort ?? "created_at_desc") === "created_at_desc"
      ? { created_at: "desc" as const }
      : { created_at: "desc" as const };
  const [records, items] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_snapshots.count({ where }),
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
  ]);
  return {
    data: items.map((record) => ({
      id: record.id,
      snapshot_code: record.snapshot_code,
      source_type: record.source_type,
      source_entity_id: record.source_entity_id,
      source_seller_id: record.source_seller_id,
      source_order_id: record.source_order_id,
      source_order_item_id: record.source_order_item_id,
      source_review_id: record.source_review_id,
      source_cancellation_request_id: record.source_cancellation_request_id,
      source_refund_request_id: record.source_refund_request_id,
      created_by_member_id: record.created_by_member_id,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
