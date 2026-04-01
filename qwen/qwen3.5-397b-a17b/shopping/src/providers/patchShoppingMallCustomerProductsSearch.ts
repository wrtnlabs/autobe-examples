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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProductsSearch(props: {
  customer: CustomerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build category filter with subcategories
  let categoryIds: string[] = [];
  if (props.body.category_id) {
    const allCategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: { deleted_at: null },
        select: { id: true, parent_id: true },
      });
    const selectedCategory = allCategories.find(
      (c) => c.id === props.body.category_id,
    );
    if (selectedCategory) {
      categoryIds = getAllSubcategoryIds(props.body.category_id, allCategories);
      categoryIds.push(props.body.category_id);
    }
  }
  // Build where clause
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(categoryIds.length > 0 && {
      category_id: { in: categoryIds },
    }),
    ...(props.body.min_price !== undefined && {
      base_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lte: props.body.max_price },
    }),
  };
  // Build order by
  const sort = props.body.sort ?? "newest";
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput =
    sort === "priceAsc"
      ? { base_price: "asc" }
      : sort === "priceDesc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
          orderBy: { display_order: "asc" },
          take: 1,
        },
        variants: {
          select: {
            id: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: (page ?? 0) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: (limit ?? 0) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: (total ?? 0) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: (Math.ceil((total ?? 0) / (limit ?? 1)) ??
        0) satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (product) => {
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            product.reviews.length
          : null;
      return {
        id: (product.id ?? "") satisfies string as string & tags.Format<"uuid">,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        min: product.base_price,
        max: product.base_price,
        seller: await ShoppingMallSellerAtSummaryTransformer.transform(
          product.seller,
        ),
        category: await ShoppingMallCategoryAtSummaryTransformer.transform(
          product.category,
        ),
        image: product.images.length > 0 ? product.images[0].image_url : null,
        rating: {
          averageRating: avgRating,
          totalReviews: product.reviews.length,
        },
        created_at: toISOStringSafe(product.created_at),
        updated_at: toISOStringSafe(product.updated_at),
        deleted_at: product.deleted_at
          ? toISOStringSafe(product.deleted_at)
          : null,
      };
    }),
  };
}
function getAllSubcategoryIds(
  categoryId: string,
  allCategories: {
    id: string;
    parent_id: string | null;
  }[],
): string[] {
  const result: string[] = [];
  const children = allCategories.filter((c) => c.parent_id === categoryId);
  for (const child of children) {
    result.push(child.id);
    result.push(...getAllSubcategoryIds(child.id, allCategories));
  }
  return result;
}
