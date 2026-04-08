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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCancellationRequestsCancellationRequestIdSnapshots(props: {
  admin: AdminPayload;
  cancellationRequestId: string;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtConditions: Prisma.DateTimeFilter | undefined =
    props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          ...(props.body.createdAtFrom !== null && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== null && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const whereInput = {
    cancellation_request_id: props.cancellationRequestId,
    ...(props.body.statusBefore !== null && {
      status_before: props.body.statusBefore,
    }),
    ...(props.body.statusAfter !== null && {
      status_after: props.body.statusAfter,
    }),
    ...(createdAtConditions !== undefined && {
      created_at: createdAtConditions,
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  const orderByInput =
    props.body.sortField === "created_at"
      ? { created_at: (props.body.sortOrder ?? "desc") as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
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
