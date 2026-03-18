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
  const createdAtFrom = props.body.createdAtFrom
    ? new Date(props.body.createdAtFrom)
    : undefined;
  const createdAtTo = props.body.createdAtTo
    ? new Date(props.body.createdAtTo)
    : undefined;
  const where = {
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
    ...(createdAtFrom || createdAtTo
      ? {
          created_at: {
            ...(createdAtFrom ? { gte: createdAtFrom } : {}),
            ...(createdAtTo ? { lte: createdAtTo } : {}),
          },
        }
      : {}),
    snapshotParties: {
      some: {
        can_view: true,
        party_type: "member",
        party_id: props.member.id,
        deleted_at: null,
      },
    },
  } satisfies Prisma.shopping_mall_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_snapshotsOrderByWithRelationInput;
  const [rows, total] = [
    await MyGlobal.prisma.shopping_mall_snapshots.findMany({
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
    await MyGlobal.prisma.shopping_mall_snapshots.count({ where }),
  ];
  const toUuid = (value: string): string & tags.Format<"uuid"> =>
    typia.assert<string & tags.Format<"uuid">>(value);
  const toDateTime = (value: string): string & tags.Format<"date-time"> =>
    typia.assert<string & tags.Format<"date-time">>(value);
  const data: IShoppingMallSnapshot.ISummary[] = rows.map(
    (r) =>
      ({
        id: toUuid(r.id),
        snapshot_code: r.snapshot_code,
        source_type: r.source_type,
        source_entity_id: toUuid(r.source_entity_id),
        source_seller_id:
          r.source_seller_id === null ? null : toUuid(r.source_seller_id),
        source_order_id:
          r.source_order_id === null ? null : toUuid(r.source_order_id),
        source_order_item_id:
          r.source_order_item_id === null
            ? null
            : toUuid(r.source_order_item_id),
        source_review_id:
          r.source_review_id === null ? null : toUuid(r.source_review_id),
        source_cancellation_request_id:
          r.source_cancellation_request_id === null
            ? null
            : toUuid(r.source_cancellation_request_id),
        source_refund_request_id:
          r.source_refund_request_id === null
            ? null
            : toUuid(r.source_refund_request_id),
        created_by_member_id:
          r.created_by_member_id === null
            ? null
            : toUuid(r.created_by_member_id),
        reason: r.reason,
        created_at: toDateTime(r.created_at.toISOString()),
        updated_at: toDateTime(r.updated_at.toISOString()),
        deleted_at:
          r.deleted_at === null ? null : toDateTime(r.deleted_at.toISOString()),
      }) satisfies IShoppingMallSnapshot.ISummary,
  );
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
