import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 100);
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.created_at_before && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.created_at_after && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.status_before && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after && { status_after: props.body.status_after }),
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort_by === "action_type"
      ? {
          action_type:
            props.body.sort_order === "ASC" ? "asc" : ("desc" as const),
        }
      : props.body.sort_by === "actor_type"
        ? {
            actor_type:
              props.body.sort_order === "ASC" ? "asc" : ("desc" as const),
          }
        : {
            created_at:
              props.body.sort_order === "ASC" ? "asc" : ("desc" as const),
          }
  ) satisfies Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        refund_request_id: true,
        actor_type: true,
        action_type: true,
        status_before: true,
        status_after: true,
        reason_before: true,
        reason_after: true,
        response_before: true,
        response_after: true,
        metadata_before: true,
        metadata_after: true,
        created_at: true,
        deleted_at: true,
      } satisfies Prisma.ecommerce_mall_refund_request_snapshotsSelect,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(data, async (record) => {
    return {
      id: record.id,
      refundRequestId: record.refund_request_id,
      actorType: typia.assert<"customer" | "seller" | "admin" | "super_admin">(
        record.actor_type,
      ),
      actionType: typia.assert<
        | "approved"
        | "rejected"
        | "created"
        | "status_changed"
        | "response_added"
      >(record.action_type),
      statusBefore: record.status_before,
      statusAfter: record.status_after,
      reasonBefore: record.reason_before,
      reasonAfter: record.reason_after,
      responseBefore: record.response_before,
      responseAfter: record.response_after,
      metadataBefore: record.metadata_before,
      metadataAfter: record.metadata_after,
      createdAt: toISOStringSafe(record.created_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    } satisfies IEcommerceMallRefundRequestSnapshot.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
