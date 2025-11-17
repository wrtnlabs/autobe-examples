import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallProductsSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = [];
  if (props.body.filter_snapshot_at_gte) {
    whereConditions.push({
      snapshot_at: { gte: props.body.filter_snapshot_at_gte },
    });
  }
  if (props.body.filter_snapshot_at_lte) {
    whereConditions.push({
      snapshot_at: { lte: props.body.filter_snapshot_at_lte },
    });
  }

  const whereCondition =
    whereConditions.length > 0 ? { AND: whereConditions } : undefined;

  const sortByField = props.body.sort_by ?? "snapshot_at";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortByField]: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_product_snapshots.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      shopping_mall_product_id: item.shopping_mall_product_id,
      code: item.code,
      title: item.title,
      snapshot_at: toISOStringSafe(item.snapshot_at),
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
