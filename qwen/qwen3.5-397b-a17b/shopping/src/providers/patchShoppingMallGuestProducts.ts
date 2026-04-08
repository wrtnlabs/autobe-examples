import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuestProducts(props: {
  guest: GuestPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  if (props.body.categoryId !== undefined) {
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
    });
  }
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      approval_status: "approved",
      deleted_at: null,
    },
  };
  if (props.body.search && props.body.search.trim().length > 0) {
    whereInput.OR = [
      { name: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }
  if (props.body.categoryId !== undefined) {
    whereInput.shopping_mall_category_id = props.body.categoryId;
  }
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    whereInput.base_price = {};
    if (props.body.minPrice !== undefined) {
      whereInput.base_price.gte = props.body.minPrice;
    }
    if (props.body.maxPrice !== undefined) {
      whereInput.base_price.lte = props.body.maxPrice;
    }
  }
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput =
    (() => {
      const sort = props.body.sort;
      if (sort === "price_asc") {
        return { base_price: "asc" };
      }
      if (sort === "price_desc") {
        return { base_price: "desc" };
      }
      if (sort === "name_asc") {
        return { name: "asc" };
      }
      if (sort === "newest") {
        return { created_at: "desc" };
      }
      if (sort === "relevance") {
        return { created_at: "desc" };
      }
      return { created_at: "desc" };
    })();
  const inStock = props.body.inStock ?? false;
  if (inStock) {
    const productIdsWithStock =
      await MyGlobal.prisma.shopping_mall_products.findMany({
        where: whereInput,
        select: {
          id: true,
          variants: {
            select: {
              inventoryRecords: {
                select: {
                  quantity_delta: true,
                },
              },
            },
          },
        },
      });
    const idsInStock = productIdsWithStock
      .filter((product) =>
        product.variants.some(
          (variant) =>
            variant.inventoryRecords.reduce(
              (sum, record) => sum + record.quantity_delta,
              0,
            ) > 0,
        ),
      )
      .map((product) => product.id);
    whereInput.id = { in: idsInStock };
    const total = await MyGlobal.prisma.shopping_mall_products.count({
      where: whereInput,
    });
    const data = await MyGlobal.prisma.shopping_mall_products.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallProductAtSummaryTransformer.select(),
    });
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        data,
        ShoppingMallProductAtSummaryTransformer.transform,
      ),
    };
  } else {
    const [data, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_products.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...ShoppingMallProductAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: whereInput,
      }),
    ]);
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        data,
        ShoppingMallProductAtSummaryTransformer.transform,
      ),
    };
  }
}
