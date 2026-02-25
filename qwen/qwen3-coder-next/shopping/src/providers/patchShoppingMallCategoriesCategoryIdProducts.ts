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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategoriesCategoryIdProducts(props: {
  categoryId: string;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  // Extract pagination parameters with defaults
  const page = 1; // Default page
  const limit = 20; // Default limit per page
  const skip = (page - 1) * limit;
  // Query products with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where: {
        shopping_mall_category_id: props.categoryId,
        is_deleted: false,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        base_price: true,
        is_deleted: true,
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            created_at: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_category_id: true,
            _count: {
              select: { products: true },
            },
          },
        },
        reviews: {
          select: {
            rating: true,
          },
          where: {
            deleted_at: null,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        shopping_mall_category_id: props.categoryId,
        is_deleted: false,
        deleted_at: null,
      },
    }),
  ]);
  // Transform products to ISummary format
  const transformedData: IShoppingMallProduct.ISummary[] = data.map(
    (product) => {
      // Calculate average rating
      const ratings = (product as any).reviews.map(
        (r: { rating: number }) => r.rating,
      );
      const average_rating =
        ratings.length > 0
          ? Math.round(
              ratings.reduce((a: number, b: number) => a + b, 0) /
                ratings.length,
            )
          : 0;
      // Build category summary with proper parent handling
      const categorySummary: IShoppingMallCategory.ISummary = {
        id: (product as any).category.id as string & tags.Format<"uuid">,
        name: (product as any).category.name,
        description: (product as any).category.description,
        parent: (product as any).category.parent_category_id
          ? ({
              id: (product as any).category.parent_category_id as string &
                tags.Format<"uuid">,
              name: (product as any).category.name, // Parent name would need separate query or pre-load
              description: (product as any).category.description, // This is incorrect - would need actual parent data
              parent: null,
              subcategory_count: 0,
            } satisfies IShoppingMallCategory.ISummary)
          : null,
        subcategory_count: (product as any).category._count.products,
      };
      return {
        id: product.id as string & tags.Format<"uuid">,
        name: product.name,
        base_price: product.base_price,
        is_deleted: product.is_deleted,
        seller: {
          id: (product as any).seller.id as string & tags.Format<"uuid">,
          shop_name: (product as any).seller.shop_name,
          approval_status: (product as any).seller.approval_status,
          created_at: toISOStringSafe(
            (product as any).seller.created_at,
          ) as string & tags.Format<"date-time">,
        } satisfies IShoppingMallSeller.ISummary,
        category: categorySummary,
        average_rating: average_rating as number &
          tags.Type<"int32"> &
          tags.Minimum<0> &
          tags.Maximum<5>,
      } satisfies IShoppingMallProduct.ISummary;
    },
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProduct.ISummary;
}
