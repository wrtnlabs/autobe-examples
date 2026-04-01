import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistItemAtSummaryTransformer } from "../transformers/ShoppingMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "desc";
  const inStockOnly = props.body.inStockOnly ?? false;
  const whereInput: Prisma.shopping_mall_wishlist_itemsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    product: {
      deleted_at: null,
    },
  };
  const orderByInput: Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput =
    {
      created_at: sort === "asc" ? "asc" : "desc",
    };
  const data = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: whereInput,
  });
  let filteredData = data;
  if (inStockOnly) {
    const wishlistItemsWithStock = await Promise.all(
      data.map(async (item) => {
        const variantStocks =
          await MyGlobal.prisma.shopping_mall_product_variants.findMany({
            where: {
              shopping_mall_product_id: item.product.id,
              deleted_at: null,
            },
            select: {
              id: true,
            },
          });
        const hasStock = await Promise.all(
          variantStocks.map(async (variant) => {
            const inventoryRecords =
              await MyGlobal.prisma.shopping_mall_product_inventory_records.findMany(
                {
                  where: {
                    product_variant_id: variant.id,
                  },
                  select: {
                    quantity_change: true,
                  },
                },
              );
            const totalStock = inventoryRecords.reduce(
              (sum, record) => sum + record.quantity_change,
              0,
            );
            return totalStock > 0 ? item : null;
          }),
        );
        return hasStock.some((item) => item !== null) ? item : null;
      }),
    );
    filteredData = wishlistItemsWithStock.filter(
      (item): item is (typeof data)[0] => item !== null,
    );
  }
  return {
    data: await ArrayUtil.asyncMap(
      filteredData,
      ShoppingMallWishlistItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: inStockOnly ? filteredData.length : total,
      pages: Math.ceil((inStockOnly ? filteredData.length : total) / limit),
    } satisfies IPage.IPagination,
  };
}
