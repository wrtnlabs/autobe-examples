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
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {};
  const data =
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map(() => ({})),
  };
}
