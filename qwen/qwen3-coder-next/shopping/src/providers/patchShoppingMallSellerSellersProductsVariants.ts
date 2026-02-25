import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellersProductsVariants(props: {
  seller: SellerPayload;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.seller.id,
  };
  // Apply SKU search filter if present
  if (props.body.search) {
    where.sku_code = {
      contains: props.body.search,
    };
  }
  // Apply stock status filter if present
  if (props.body.stockStatus) {
    if (props.body.stockStatus === "in_stock") {
      where.stock_quantity = {
        gt: 0,
      };
    } else if (props.body.stockStatus === "out_of_stock") {
      where.stock_quantity = {
        equals: 0,
      };
    }
  }
  // Fetch paginated data
  const data = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      shopping_mall_product_id: "desc",
    },
    select: {
      id: true,
      sku_code: true,
      price_override: true,
      stock_quantity: true,
      shopping_mall_product_id: true,
    },
  });
  // Fetch total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where,
  });
  // Transform data to ISummary format
  const transformedData = data.map((variant) => ({
    id: variant.id,
    sku_code: variant.sku_code,
    price_override: variant.price_override,
    stock_quantity: variant.stock_quantity,
    shopping_mall_product_id: variant.shopping_mall_product_id,
    shoppingMallProductVariantOptionValues: [],
  }));
  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
  };
}
