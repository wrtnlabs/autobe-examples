import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCancellationRequestsRequestIdSnapshots(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot> {
  // Validate that the cancellation request exists
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
    where: { id: props.requestId },
    select: { id: true },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause from request body filters
  const whereInput = {
    ecommerce_mall_cancellation_request_id: props.requestId,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  // Transform and return paginated response
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallCancellationRequestSnapshotTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
