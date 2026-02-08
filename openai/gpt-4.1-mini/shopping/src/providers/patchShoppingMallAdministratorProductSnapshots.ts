import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

export async function patchShoppingMallAdministratorProductSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_snapshotsWhereInput = {};
  // No filtering because props.body properties do not exist
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where,
  });
  const dataRaw =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const data: IShoppingMallProductSnapshot.ISummary[] = dataRaw.map(
    (record) => ({
      id: record.id,
      product_id: record.shopping_mall_product_id,
      product_name: record.name,
      description: record.description,
      category_id: record.category_id,
      base_price: record.base_price,
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
