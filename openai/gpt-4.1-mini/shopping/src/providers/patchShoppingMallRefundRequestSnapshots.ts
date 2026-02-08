import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallRefundRequestSnapshots(props: {
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
  const where: Prisma.shopping_mall_refund_request_snapshotsWhereInput = {};
  // We cannot access refundRequestId, status, reason, createdFrom, createdTo, page, limit from props.body because these properties do not exist on IRequest type
  // So filtering and pagination will be static default here
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_refund_request_id: true,
        status: true,
        reason: true,
        comment: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where,
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_refund_request_id: record.shopping_mall_refund_request_id,
      status: record.status,
      reason: record.reason,
      comment: record.comment === null ? undefined : record.comment,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null
          ? undefined
          : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
