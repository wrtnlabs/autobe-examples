import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategoriesCategoryIdProducts(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  // 1. Validate categoryId exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  // 2. Recursively collect all subcategory IDs
  const collectSubcategoryIds = async (parentId: string): Promise<string[]> => {
    const subcategories =
      await MyGlobal.prisma.ecommerce_mall_categories.findMany({
        where: { parent_id: parentId, deleted_at: null },
        select: { id: true },
      });
    const ids: string[] = [];
    for (const sub of subcategories) {
      ids.push(sub.id);
      const childIds = await collectSubcategoryIds(sub.id);
      ids.push(...childIds);
    }
    return ids;
  };
  const subcategoryIds = await collectSubcategoryIds(props.categoryId);
  const allCategoryIds = [props.categoryId, ...subcategoryIds];
  // 3. Build WHERE conditions
  const whereConditions: Prisma.ecommerce_mall_productsWhereInput[] = [
    { ecommerce_mall_category_id: { in: allCategoryIds } },
    { deleted_at: null },
  ];
  // inStock filter: at least one variant with quantity > 0 and not deleted
  if (props.body.inStock === true) {
    whereConditions.push({
      variants: {
        some: {
          quantity: { gt: 0 },
          deleted_at: null,
        },
      },
    });
  }
  // minPrice filter
  if (props.body.minPrice !== undefined) {
    whereConditions.push({
      base_price: { gte: props.body.minPrice },
    });
  }
  // maxPrice filter
  if (props.body.maxPrice !== undefined) {
    whereConditions.push({
      base_price: { lte: props.body.maxPrice },
    });
  }
  // search filter (partial match on name, case-insensitive)
  if (props.body.search !== undefined) {
    whereConditions.push({
      name: { contains: props.body.search, mode: "insensitive" },
    });
  }
  // 4. Build ORDER BY
  const sort = props.body.sort ?? "newest";
  let orderBy:
    | Prisma.ecommerce_mall_productsOrderByWithRelationInput
    | Prisma.ecommerce_mall_productsOrderByWithRelationInput[];
  if (sort === "price_asc") {
    orderBy = [{ base_price: "asc" }, { created_at: "desc" }];
  } else if (sort === "price_desc") {
    orderBy = [{ base_price: "desc" }, { created_at: "desc" }];
  } else {
    orderBy = { created_at: "desc" };
  }
  // 5. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 6. Query products with joins for summary fields
  const rows = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: { AND: whereConditions },
    orderBy: orderBy,
    skip: skip,
    take: limit,
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
      seller: {
        select: {
          profile: {
            select: {
              name: true,
            },
          },
        },
      },
      productImages: {
        where: { display_order: 0 },
        select: { image_url: true },
        take: 1,
      },
      reviews: {
        where: { deleted_at: null },
        select: { rating: true },
      },
      variants: {
        where: { deleted_at: null },
        select: { price: true },
      },
    },
  });
  // 7. Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: { AND: whereConditions },
  });
  // 8. Transform to response DTO
  const data: IEcommerceMallProduct.ISummary[] = rows.map(
    (row): IEcommerceMallProduct.ISummary => {
      // Calculate price range from variants
      const variantPrices = row.variants
        .map((v: { price: number | null }) => v.price)
        .filter((p: number | null): p is number => p !== null);
      const min_price =
        variantPrices.length > 0 ? Math.min(...variantPrices) : row.base_price;
      const max_price =
        variantPrices.length > 0 ? Math.max(...variantPrices) : row.base_price;
      // Calculate average rating
      const ratings = row.reviews.map((r: { rating: number }) => r.rating);
      const average_rating =
        ratings.length > 0
          ? ratings.reduce((sum: number, r: number) => sum + r, 0) /
            ratings.length
          : 0;
      return {
        id: row.id as string & tags.Format<"uuid">,
        name: row.name,
        min_price: min_price,
        max_price: max_price,
        primary_image_url: row.productImages[0]?.image_url ?? "",
        seller_name: row.seller?.profile?.name ?? "",
        average_rating: Number(average_rating.toFixed(2)),
        reviews_count: ratings.length as number & tags.Type<"int32">,
        created_at: toISOStringSafe(row.created_at),
      };
    },
  );
  return {
    data: data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as
        | number
        | (number & tags.Type<"int32"> & tags.Minimum<0>),
    } satisfies IPage.IPagination,
  };
}
