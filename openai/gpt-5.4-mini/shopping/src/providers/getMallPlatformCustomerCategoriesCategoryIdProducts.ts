import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerCategoriesCategoryIdProducts(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformProduct.ISummary> {
  await MyGlobal.prisma.mall_platform_categories.findFirstOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = 1;
  const limit: number = 20;
  const skip: number = (page - 1) * limit;
  const productsWhere = {
    category_id: props.categoryId,
    deleted_at: null,
    sellerAccount: {
      deleted_at: null,
      suspended_at: null,
    },
  } satisfies Prisma.mall_platform_productsWhereInput;
  const records: number = await MyGlobal.prisma.mall_platform_products.count({
    where: productsWhere,
  });
  const products = await MyGlobal.prisma.mall_platform_products.findMany({
    where: productsWhere,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      sellerAccount: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          rejection_reason: true,
          suspended_at: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      },
      category: {
        select: {
          id: true,
          parentCategory: {
            select: {
              id: true,
              parentCategory: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      images: {
        where: {
          deleted_at: null,
        },
        orderBy: [
          { is_main: "desc" },
          { sort_order: "asc" },
          { created_at: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          image_url: true,
          sort_order: true,
          is_main: true,
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
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: products.map((product) => {
      const ratings: number[] = product.reviews.map((review) => review.rating);
      const averageRating: number | null =
        ratings.length === 0
          ? null
          : ratings.reduce(
              (accumulator: number, rating: number) => accumulator + rating,
              0,
            ) / ratings.length;
      const mainImage = product.images.length === 0 ? null : product.images[0];
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.base_price,
        sellerAccount: {
          id: product.sellerAccount.id,
          email: product.sellerAccount.email,
          approvalStatus: product.sellerAccount.approval_status,
          rejectionReason: product.sellerAccount.rejection_reason,
          suspendedAt:
            product.sellerAccount.suspended_at === null
              ? null
              : product.sellerAccount.suspended_at.toISOString(),
          deletedAt:
            product.sellerAccount.deleted_at === null
              ? null
              : product.sellerAccount.deleted_at.toISOString(),
          createdAt: product.sellerAccount.created_at.toISOString(),
          updatedAt: product.sellerAccount.updated_at.toISOString(),
        },
        category:
          product.category === null
            ? null
            : {
                id: product.category.id,
                parentCategory:
                  product.category.parentCategory === null
                    ? null
                    : {
                        id: product.category.parentCategory.id,
                        parentCategory: null,
                        name: product.category.parentCategory.name,
                        description:
                          product.category.parentCategory.description,
                        createdAt:
                          product.category.parentCategory.created_at.toISOString(),
                        updatedAt:
                          product.category.parentCategory.updated_at.toISOString(),
                        deletedAt:
                          product.category.parentCategory.deleted_at === null
                            ? null
                            : product.category.parentCategory.deleted_at.toISOString(),
                      },
                name: product.category.name,
                description: product.category.description,
                createdAt: product.category.created_at.toISOString(),
                updatedAt: product.category.updated_at.toISOString(),
                deletedAt:
                  product.category.deleted_at === null
                    ? null
                    : product.category.deleted_at.toISOString(),
              },
        createdAt: product.created_at.toISOString(),
        updatedAt: product.updated_at.toISOString(),
        deletedAt:
          product.deleted_at === null ? null : product.deleted_at.toISOString(),
      } satisfies IMallPlatformProduct.ISummary;
    }),
  };
}
