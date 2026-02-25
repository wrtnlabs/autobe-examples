import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCancellationRequestSnapshotsHistory(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_cancellation_request_snapshotsWhereInput =
    {};
  if (props.body.cancellationRequestId !== undefined) {
    where.cancellation_request_id = props.body.cancellationRequestId;
  }
  if (props.body.sellerApprovalStatus !== undefined) {
    (where as any).sellerApprovalStatus = props.body.sellerApprovalStatus;
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (
    props.body.requestedAtFrom !== undefined ||
    props.body.requestedAtTo !== undefined
  ) {
    (where as any).AND = [];
    if (props.body.requestedAtFrom !== undefined) {
      (where as any).AND.push({
        requested_at: { gte: props.body.requestedAtFrom },
      });
    }
    if (props.body.requestedAtTo !== undefined) {
      (where as any).AND.push({
        requested_at: { lte: props.body.requestedAtTo },
      });
    }
    if ((where as any).AND.length === 0) {
      delete (where as any).AND;
    }
  }
  const toDateTimeStringNonNull = (
    value: Date | null | undefined,
  ): string & tags.Format<"date-time"> => {
    return toISOStringSafe(value ?? new Date());
  };
  const records =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where,
    });
  return {
    data: records.map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: toDateTimeStringNonNull(r.created_at),
      updatedAt: toDateTimeStringNonNull(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      cancellationRequestId: r.cancellation_request_id,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
