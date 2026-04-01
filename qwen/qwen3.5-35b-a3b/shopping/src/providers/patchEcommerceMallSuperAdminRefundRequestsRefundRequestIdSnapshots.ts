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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminRefundRequestsRefundRequestIdSnapshots(props: {
  superAdmin: SuperAdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    deleted_at: null,
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
  } satisfies Prisma.ecommerce_mall_refund_request_snapshotsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput =
    props.body.sort_by
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "ASC" ? "asc" : "desc",
        }
      : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        sellerSnapshot: true,
        refundRequest: true,
        customerSnapshots: true,
        adminSubtype: true,
        ofSuperAdmin: true,
      },
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
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  };
}
