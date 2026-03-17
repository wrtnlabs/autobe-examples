import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function getShoppingMallCategoriesCategoryIdProducts(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Verify category exists and is not deleted
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  // Query products in the category
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: {
      shopping_category_id: props.categoryId,
      deleted: false,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          shop_name: true,
          shop_description: true,
          logo_image_url: true,
          approval_status: true,
          suspended: true,
          created_at: true,
          approvedByAdmin: {
            select: {
              id: true,
              email: true,
              grade: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          parent: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
            },
          },
        },
      } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
      images: {
        where: { deleted_at: null },
        orderBy: { display_order: "asc" },
        take: 1,
        select: {
          id: true,
          image_url: true,
          display_order: true,
          created_at: true,
        },
      } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
    },
  } satisfies Prisma.shopping_mall_productsFindManyArgs);
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      shopping_category_id: props.categoryId,
      deleted: false,
    },
  });
  // Get review statistics for all products
  const reviewStats =
    products.length > 0
      ? await MyGlobal.prisma.shopping_mall_reviews.groupBy({
          by: ["shopping_product_id"],
          where: {
            shopping_product_id: { in: products.map((p) => p.id) },
            deleted: false,
          },
          _avg: { rating: true },
          _count: { id: true },
        })
      : [];
  const reviewMap = new Map(
    reviewStats.map((stat) => [
      stat.shopping_product_id,
      {
        averageRating: stat._avg.rating,
        reviewCount: stat._count.id,
      },
    ]),
  );
  // Get variant counts for all products
  const variantCounts =
    products.length > 0
      ? await MyGlobal.prisma.shopping_mall_product_variants.groupBy({
          by: ["shopping_mall_product_id"],
          where: {
            shopping_mall_product_id: { in: products.map((p) => p.id) },
            deleted: false,
          },
          _count: { id: true },
        })
      : [];
  const variantCountMap = new Map(
    variantCounts.map((stat) => [
      stat.shopping_mall_product_id,
      stat._count.id ?? 0,
    ]),
  );
  // Transform to DTO
  const data = products.map((product) => {
    const stats = reviewMap.get(product.id);
    const mainImage = product.images[0];
    const variantCount = variantCountMap.get(product.id) ?? 0;
    return {
      id: product.id as string & tags.Format<"uuid">,
      name: product.name,
      basePrice: product.base_price,
      seller: {
        id: product.seller.id as string & tags.Format<"uuid">,
        email: product.seller.email as string & tags.Format<"email">,
        shop_name: product.seller.shop_name,
        shop_description: product.seller.shop_description ?? null,
        logo_image_url: product.seller.logo_image_url
          ? (product.seller.logo_image_url as string & tags.Format<"uri">)
          : null,
        approval_status: product.seller.approval_status as
          | "PENDING"
          | "APPROVED"
          | "REJECTED",
        suspended: product.seller.suspended,
        created_at: toISOStringSafe(product.seller.created_at),
        approvedByAdmin: product.seller.approvedByAdmin
          ? ({
              id: product.seller.approvedByAdmin.id as string &
                tags.Format<"uuid">,
              email: product.seller.approvedByAdmin.email as string &
                tags.Format<"email">,
              grade: product.seller.approvedByAdmin.grade,
              created_at: toISOStringSafe(
                product.seller.approvedByAdmin.created_at,
              ),
              updated_at: toISOStringSafe(
                product.seller.approvedByAdmin.updated_at,
              ),
              deleted_at: product.seller.approvedByAdmin.deleted_at
                ? toISOStringSafe(product.seller.approvedByAdmin.deleted_at)
                : null,
            } satisfies IShoppingMallAdmin.ISummary)
          : null,
      } satisfies IShoppingMallSeller.ISummary,
      category: {
        id: product.category.id as string & tags.Format<"uuid">,
        name: product.category.name,
        description: product.category.description ?? undefined,
        parent: product.category.parent
          ? ({
              id: product.category.parent.id as string & tags.Format<"uuid">,
              name: product.category.parent.name,
              description: product.category.parent.description ?? undefined,
              created_at: toISOStringSafe(product.category.parent.created_at),
            } satisfies IShoppingMallCategory.ISummary)
          : undefined,
        created_at: toISOStringSafe(product.category.created_at),
      } satisfies IShoppingMallCategory.ISummary,
      mainImage: mainImage
        ? ({
            id: mainImage.id as string & tags.Format<"uuid">,
            imageUrl: mainImage.image_url as string & tags.Format<"uri">,
            displayOrder: mainImage.display_order,
            createdAt: toISOStringSafe(mainImage.created_at),
          } satisfies IShoppingMallProductImage.ISummary)
        : undefined,
      variantCount: variantCount,
      averageRating: stats?.averageRating ?? undefined,
      reviewCount: stats?.reviewCount ?? 0,
      createdAt: toISOStringSafe(product.created_at),
    } satisfies IShoppingMallProduct.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallProduct.ISummary;
}
