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
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCancellationRequestSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      ...(props.body.cancellationRequestId !== undefined && {
        ecommerce_mall_cancellation_request_id:
          props.body.cancellationRequestId,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      ...(props.body.createdAtFrom !== undefined &&
        props.body.createdAtTo !== undefined && {
          created_at: {
            gte: new Date(props.body.createdAtFrom),
            lte: new Date(props.body.createdAtTo),
          },
        }),
      ...(props.body.createdAtFrom !== undefined &&
        props.body.createdAtTo === undefined && {
          created_at: {
            gte: new Date(props.body.createdAtFrom),
          },
        }),
      ...(props.body.createdAtFrom === undefined &&
        props.body.createdAtTo !== undefined && {
          created_at: {
            lte: new Date(props.body.createdAtTo),
          },
        }),
    };
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereCondition,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
