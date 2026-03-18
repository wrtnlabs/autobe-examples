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

export async function patchShoppingMallMemberSnapshotsHistory(props: {
  member: MemberPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IPageIShoppingMallSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereVisibility = {
    shopping_mall_snapshot_id: undefined,
    party_type: props.member.type,
    party_id: props.member.id,
    can_view: true,
    deleted_at: null,
  } as const;
  const whereFilters = {
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
    deleted_at: null,
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: props.body.createdAtFrom,
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: props.body.createdAtTo,
            }),
          },
        }
      : {}),
    snapshotParties: {
      some: {
        party_type: whereVisibility.party_type,
        party_id: whereVisibility.party_id,
        can_view: true,
        deleted_at: null,
      },
    },
  };
  const [items, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_snapshots.findMany({
      where: whereFilters as any,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
      where: whereFilters as any,
    }),
  ]);
  const pages = Math.ceil(records / limit);
  return {
    data: items.map((s) => ({
      id: typia.assert<string & tags.Format<"uuid">>(String(s.id)),
      snapshot_code: s.snapshot_code,
      source_type: s.source_type,
      source_entity_id: typia.assert<string & tags.Format<"uuid">>(
        String(s.source_entity_id),
      ),
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
    })) satisfies IShoppingMallSnapshot.ISummary[],
    pagination: {
      current: page,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
  };
}
