import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  page?: number & tags.Type<"int32">;
  limit?: number & tags.Type<"int32">;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Validate product exists and is active
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
    });
  const page = (props.page ?? 1) satisfies number as number;
  const limit = (props.limit ?? 20) satisfies number as number;
  const skip = (page - 1) * limit;
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
        stock_quantity: { gte: 0 },
      },
      orderBy: { sku_code: "asc" },
      skip,
      take: limit,
      select: ShoppingMallProductVariantAtSummaryTransformer.select().select,
    });
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where: {
      product_id: props.productId,
      deleted_at: null,
      stock_quantity: { gte: 0 },
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      variants,
      ShoppingMallProductVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductVariant.ISummary;
}
