import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  // Verify cancellation request exists and belongs to seller's order item
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        id: props.cancellationRequestId,
        orderItem: {
          seller: {
            id: props.seller.id,
          },
        },
      },
      select: { id: true },
    });
  if (cancellationRequest === null) {
    throw new HttpException(
      "Cancellation request not found or access denied",
      404,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const where: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      cancellation_request_id: props.cancellationRequestId,
    };
  if (props.body.createdAtFrom !== null || props.body.createdAtTo !== null) {
    where.created_at = {};
    if (props.body.createdAtFrom !== null) {
      where.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== null) {
      where.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  if (props.body.statusBefore !== null) {
    where.status_before = props.body.statusBefore;
  }
  if (props.body.statusAfter !== null) {
    where.status_after = props.body.statusAfter;
  }
  // Determine sort order
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy = {
    created_at: sortOrder,
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput;
  // Execute queries
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
