import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function patchShoppingMallSellerProductsInventoryLowStock(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ILowStockRequest;
}): Promise<IPageIShoppingMallProduct.ILowStockSummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const threshold = props.body.threshold ?? 10;
  const skip = (page - 1) * limit;
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      variants: {
        where: {
          deleted_at: null,
        },
        select: {
          sku_code: true,
          inventoryRecords: {
            select: {
              quantity_change: true,
            },
          },
        },
      },
    },
  });
  const productStocks = products.map((product) => {
    const current_stock = product.variants.reduce((sum, variant) => {
      const variantStock = variant.inventoryRecords.reduce(
        (variantSum, record) => variantSum + record.quantity_change,
        0,
      );
      return sum + variantStock;
    }, 0);
    return {
      id: product.id,
      name: product.name,
      sku_codes: product.variants.map((v) => v.sku_code),
      current_stock,
    };
  });
  const lowStockProducts = productStocks.filter(
    (p) => p.current_stock < threshold,
  );
  lowStockProducts.sort((a, b) => a.current_stock - b.current_stock);
  const total = lowStockProducts.length;
  const pages = Math.ceil(total / limit);
  const paginatedProducts = lowStockProducts.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: paginatedProducts.map(
      (p) =>
        ({
          id: p.id,
          name: p.name,
          sku_codes: p.sku_codes,
          current_stock: p.current_stock,
          threshold,
        }) satisfies IShoppingMallProduct.ILowStockSummary,
    ),
  } satisfies IPageIShoppingMallProduct.ILowStockSummary;
}
