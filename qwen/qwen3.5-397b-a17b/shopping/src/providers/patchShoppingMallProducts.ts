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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
      },
    }),
    ...(props.body.category_id && {
      category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: {
        gte: props.body.min_price,
      },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: {
        lte: props.body.max_price,
      },
    }),
  };
  const orderByInput =
    props.body.sort === "priceAsc"
      ? { base_price: "asc" as const }
      : props.body.sort === "priceDesc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const };
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
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
      seller: {
        select: {
          id: true,
          email: true,
          created_at: true,
          approvalRequests: {
            select: {
              status: true,
              submitted_at: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          parent: {
            select: {
              id: true,
            },
          },
          children: {
            select: {
              id: true,
            },
          },
          snapshots: {
            select: {
              id: true,
            },
          },
          products: {
            select: {
              id: true,
            },
          },
          productSnapshots: {
            select: {
              id: true,
            },
          },
        },
      },
      images: {
        where: {
          deleted_at: null,
        },
        orderBy: {
          display_order: "asc" as const,
        },
        take: 1,
        select: {
          id: true,
          shopping_mall_product_id: true,
          image_url: true,
          display_order: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      variants: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_product_id: true,
          sku_code: true,
          price_override: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reviews: {
        where: {
          deleted_at: null,
        },
        select: {
          rating: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  const data = products.map((product) => {
    const variantPrices = product.variants
      .map((v) => v.price_override ?? product.base_price)
      .filter((p): p is number => p !== null && p !== undefined);
    const minPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : product.base_price;
    const maxPrice =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : product.base_price;
    const averageRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
          product.reviews.length
        : null;
    const latestApproval = product.seller.approvalRequests.sort(
      (a, b) => b.submitted_at.getTime() - a.submitted_at.getTime(),
    )[0];
    const categoryHasChildren = product.category.children.length > 0;
    return {
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      seller: {
        id: product.seller.id,
        email: product.seller.email,
        created_at: toISOStringSafe(product.seller.created_at),
        approval_status: (latestApproval?.status ?? "pending") as any,
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description,
        parent: product.category.parent
          ? { id: product.category.parent.id }
          : null,
        hasChildren: categoryHasChildren,
      },
      images: product.images.map((img) => ({
        id: img.id,
        product: { id: product.id },
        image_url: img.image_url,
        display_order: img.display_order,
        created_at: toISOStringSafe(img.created_at),
        updated_at: toISOStringSafe(img.updated_at),
        deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
      })),
      variants: product.variants.map((v) => ({
        id: v.id,
        product: { id: product.id },
        skuCode: v.sku_code,
        priceOverride: v.price_override ?? null,
        created_at: toISOStringSafe(v.created_at),
        updated_at: toISOStringSafe(v.updated_at),
        deleted_at: v.deleted_at ? toISOStringSafe(v.deleted_at) : null,
      })),
      rating: {
        averageRating: averageRating,
        totalReviews: product.reviews.length,
      },
      price_range: {
        min: minPrice,
        max: maxPrice,
      },
      min: minPrice,
      max: maxPrice,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      deleted_at: product.deleted_at
        ? toISOStringSafe(product.deleted_at)
        : null,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
