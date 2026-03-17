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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequestsRefundRequestIdSnapshots(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const safeLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * safeLimit;
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: { lt: props.body.created_at_before },
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: { gt: props.body.created_at_after },
    }),
    ...(props.body.status_before !== undefined && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after !== undefined && {
      status_after: props.body.status_after,
    }),
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort_by === "action_type"
      ? { action_type: props.body.sort_order === "ASC" ? "asc" : "desc" }
      : props.body.sort_by === "actor_type"
        ? { actor_type: props.body.sort_order === "ASC" ? "asc" : "desc" }
        : { created_at: props.body.sort_order === "ASC" ? "asc" : "desc" }
  ) satisfies Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: safeLimit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  };
}
