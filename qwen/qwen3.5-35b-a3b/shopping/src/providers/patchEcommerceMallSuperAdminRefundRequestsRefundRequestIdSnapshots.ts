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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminRefundRequestsRefundRequestIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 100);
  const skip = (page - 1) * limit;
  const action_typeFilter = props.body.action_type as
    | "created"
    | "status_changed"
    | "approved"
    | "rejected"
    | "response_added"
    | undefined;
  const status_beforeFilter = props.body.status_before as
    | "pending"
    | "approved"
    | "rejected"
    | "refunded"
    | undefined;
  const status_afterFilter = props.body.status_after as
    | "pending"
    | "approved"
    | "rejected"
    | "refunded"
    | undefined;
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    ...(action_typeFilter !== undefined && { action_type: action_typeFilter }),
    ...(props.body.created_at_before !== undefined && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(status_beforeFilter !== undefined && {
      status_before: status_beforeFilter,
    }),
    ...(status_afterFilter !== undefined && {
      status_after: status_afterFilter,
    }),
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  const sortOrder = (props.body.sort_order ?? "DESC").toUpperCase();
  const orderByInput =
    props.body.sort_by === "created_at"
      ? { created_at: sortOrder as Prisma.SortOrder }
      : props.body.sort_by === "action_type"
        ? { action_type: sortOrder as Prisma.SortOrder }
        : props.body.sort_by === "actor_type"
          ? { actor_type: sortOrder as Prisma.SortOrder }
          : { created_at: "DESC" as Prisma.SortOrder };
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
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
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      refundRequestId: record.refund_request_id as string & tags.Format<"uuid">,
      actorType: record.actor_type as
        | "customer"
        | "seller"
        | "admin"
        | "super_admin",
      actionType: record.action_type as
        | "created"
        | "status_changed"
        | "approved"
        | "rejected"
        | "response_added",
      statusBefore: record.status_before,
      statusAfter: record.status_after,
      reasonBefore: record.reason_before,
      reasonAfter: record.reason_after,
      responseBefore: record.response_before,
      responseAfter: record.response_after,
      metadataBefore: record.metadata_before,
      metadataAfter: record.metadata_after,
      createdAt: toISOStringSafe(record.created_at),
      deletedAt:
        record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
