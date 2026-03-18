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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.deletedState === undefined ||
    props.body.deletedState === null ||
    props.body.deletedState === "active"
      ? { deleted_at: null }
      : props.body.deletedState === "deleted"
        ? { deleted_at: { not: null } }
        : {}),
    ...(props.body.stockState === "inStock"
      ? { stock_quantity: { gt: 0 } }
      : props.body.stockState === "outOfStock"
        ? { stock_quantity: { lte: 0 } }
        : {}),
    ...(props.body.minimumPrice !== undefined &&
    props.body.minimumPrice !== null
      ? {
          OR: [
            { override_price: { gte: props.body.minimumPrice } },
            { override_price: null },
          ],
        }
      : {}),
    ...(props.body.maximumPrice !== undefined &&
    props.body.maximumPrice !== null
      ? {
          OR: [
            { override_price: { lte: props.body.maximumPrice } },
            { override_price: null },
          ],
        }
      : {}),
    ...(props.body.keyword !== undefined &&
    props.body.keyword !== null &&
    props.body.keyword.length > 0
      ? {
          sku_code: {
            contains: props.body.keyword,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const orderBy: Prisma.shopping_mall_product_variantsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "priceAsc"
        ? { override_price: "asc" }
        : props.body.sort === "priceDesc"
          ? { override_price: "desc" }
          : props.body.sort === "stockAsc"
            ? { stock_quantity: "asc" }
            : props.body.sort === "stockDesc"
              ? { stock_quantity: "desc" }
              : { created_at: "desc" };
  const data = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      sku_code: true,
      override_price: true,
      stock_quantity: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      skuCode: item.sku_code,
      overridePrice: item.override_price,
      stockQuantity: item.stock_quantity,
      createdAt: item.created_at.toISOString(),
      updatedAt: item.updated_at.toISOString(),
      deletedAt:
        item.deleted_at === null ? null : item.deleted_at.toISOString(),
    })),
  };
}
