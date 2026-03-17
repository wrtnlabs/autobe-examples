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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
    where: {
      id: props.cancellationRequestId,
      deleted_at: null,
    },
  });
  const whereInput = {
    id: props.cancellationRequestId,
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: whereInput,
      },
    );
  const snapshotWhere = {
    cancellation_request_id: props.cancellationRequestId,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.status_before && {
      status_before: props.body.status_before,
    }),
    ...(props.body.status_after && { status_after: props.body.status_after }),
    ...(props.body.action && { action: props.body.action }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: snapshotWhere,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: snapshotWhere,
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
