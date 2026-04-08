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
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequestsRefundRequestIdSnapshots(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot> {
  // Verify refund request exists
  await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
    where: { id: props.refundRequestId },
  });
  // Parse pagination params with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering
  const where: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput = {
    refund_request_id: props.refundRequestId,
    ...(props.body.status !== null && { status: props.body.status }),
    ...(props.body.reason !== null && {
      reason: { contains: props.body.reason },
    }),
    ...(props.body.responseReason !== null && {
      response_reason: { contains: props.body.responseReason },
    }),
    ...(props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  };
  // Query snapshots with pagination
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallRefundRequestSnapshotTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestSnapshotTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
