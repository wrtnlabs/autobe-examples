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

export async function patchShoppingMallAdministratorCancellationRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.shopping_mall_cancellation_request_snapshotsWhereInput =
    {};
  if (props.body.cancellationRequestId !== undefined) {
    whereClause.cancellation_request_id = props.body.cancellationRequestId;
  }
  if (props.body.status !== undefined) {
    whereClause.status = props.body.status;
  }
  if (
    props.body.requestedAtFrom !== undefined ||
    props.body.requestedAtTo !== undefined
  ) {
    whereClause.created_at = {};
    if (props.body.requestedAtFrom !== undefined) {
      whereClause.created_at.gte = props.body.requestedAtFrom;
    }
    if (props.body.requestedAtTo !== undefined) {
      whereClause.created_at.lte = props.body.requestedAtTo;
    }
  }
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereClause,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: toISOStringSafe(row.created_at),
      updatedAt: toISOStringSafe(row.updated_at),
      deletedAt: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
      cancellationRequestId: row.cancellation_request_id,
    })),
  };
}
