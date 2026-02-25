import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
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

export async function patchShoppingMallAdministratorSalesSaleIdUnitsUnitIdSnapshots(props: {
  administrator: AdministratorPayload;
  saleId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleUnitSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleUnitSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereCondition = {
    shopping_mall_sale_unit_id: props.unitId,
    ...(props.body.search
      ? {
          OR: [
            { sku_code: { contains: props.body.search } },
            { option_values: { contains: props.body.search } },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_sale_unit_snapshotsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findMany(
    {
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.count({
    where: whereCondition,
  });
  return {
    data: data.map((snapshot) => ({
      id: snapshot.id,
      skuCode: snapshot.sku_code,
      optionValues: snapshot.option_values,
      priceOverride: snapshot.price_override ?? undefined,
      stockQuantity: snapshot.stock_quantity,
      isActive: snapshot.is_active,
      createdAt: toISOStringSafe(snapshot.created_at),
      updatedAt: toISOStringSafe(snapshot.updated_at),
      deletedAt:
        snapshot.deleted_at != null
          ? toISOStringSafe(snapshot.deleted_at)
          : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
