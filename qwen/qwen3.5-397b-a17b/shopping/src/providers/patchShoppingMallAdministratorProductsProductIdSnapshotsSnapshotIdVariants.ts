import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdSnapshotsSnapshotIdVariants(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotVariant.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
    });
  const whereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
    ...(props.body.search && {
      sku_code: {
        contains: props.body.search,
      },
    }),
    ...(props.body.price_override_min !== undefined && {
      price_override: {
        gte: props.body.price_override_min,
      },
    }),
    ...(props.body.price_override_max !== undefined && {
      price_override: {
        lte: props.body.price_override_max,
      },
    }),
    ...(props.body.stock_quantity_min !== undefined && {
      stock_quantity: {
        gte: props.body.stock_quantity_min,
      },
    }),
    ...(props.body.stock_quantity_max !== undefined && {
      stock_quantity: {
        lte: props.body.stock_quantity_max,
      },
    }),
  } satisfies Prisma.shopping_mall_product_snapshot_variantsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_variants.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductSnapshotVariantAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_variants.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
