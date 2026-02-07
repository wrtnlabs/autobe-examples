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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCancellationRequestSnapshots(props: {
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_cancellation_request_snapshotsWhereInput =
    {};
  const orderInput: Prisma.shopping_mall_cancellation_request_snapshotsOrderByWithRelationInput =
    { created_at: "desc" as const };
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderInput,
        select: {
          id: true,
          shopping_mall_cancellation_request_id: true,
          customer_id: true,
          customer_session_id: true,
          seller_id: true,
          seller_session_id: true,
          request_reason: true,
          response_reason: true,
          status: true,
          created_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_cancellation_request_id:
        record.shopping_mall_cancellation_request_id,
      customer_id: record.customer_id,
      customer_session_id: record.customer_session_id,
      seller_id: record.seller_id,
      seller_session_id: record.seller_session_id,
      request_reason: record.request_reason,
      response_reason: record.response_reason,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
