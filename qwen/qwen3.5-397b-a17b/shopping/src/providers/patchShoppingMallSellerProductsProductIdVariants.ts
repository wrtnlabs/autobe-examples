import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const buildWhereInput =
    (): Prisma.shopping_mall_product_variantsWhereInput => {
      const conditions: Prisma.shopping_mall_product_variantsWhereInput[] = [];
      if (props.body.search) {
        conditions.push({
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        });
      }
      if (props.body.sku_code) {
        conditions.push({
          sku_code: { contains: props.body.sku_code, mode: "insensitive" },
        });
      }
      if (props.body.option_values) {
        conditions.push({
          option_values: {
            contains: props.body.option_values,
            mode: "insensitive",
          },
        });
      }
      if (props.body.min_price !== undefined) {
        conditions.push({ price: { gte: props.body.min_price } });
      }
      if (props.body.max_price !== undefined) {
        conditions.push({ price: { lte: props.body.max_price } });
      }
      if (props.body.deleted_at === true) {
        conditions.push({ deleted_at: { not: null } });
      } else if (props.body.deleted_at === false) {
        conditions.push({ deleted_at: null });
      }
      conditions.push({ shopping_mall_product_id: props.productId });
      return {
        AND: conditions,
      } satisfies Prisma.shopping_mall_product_variantsWhereInput;
    };
  const whereInput = buildWhereInput();
  const orderByInput: Prisma.shopping_mall_product_variantsOrderByWithRelationInput =
    (
      props.body.sort === "created_at_asc"
        ? { created_at: "asc" }
        : props.body.sort === "sku_code_asc"
          ? { sku_code: "asc" }
          : props.body.sort === "sku_code_desc"
            ? { sku_code: "desc" }
            : props.body.sort === "price_asc"
              ? { price: "asc" }
              : props.body.sort === "price_desc"
                ? { price: "desc" }
                : { created_at: "desc" }
    ) satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput;
  const allVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereInput,
      orderBy: orderByInput,
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  let filteredVariants = allVariants;
  if (props.body.in_stock !== undefined) {
    filteredVariants = allVariants.filter((variant) => {
      const stockQuantity = variant.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_delta,
        0,
      );
      return props.body.in_stock ? stockQuantity > 0 : stockQuantity <= 0;
    });
  }
  const total = filteredVariants.length;
  const paginatedVariants = filteredVariants.slice(skip, skip + limit);
  return {
    data: await ArrayUtil.asyncMap(
      paginatedVariants,
      ShoppingMallProductVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductVariant.ISummary;
}
