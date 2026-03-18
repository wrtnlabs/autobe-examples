import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const sort: "newest" | "priceAsc" | "priceDesc" = props.body.sort ?? "newest";
  if (page < 1)
    throw new HttpException("Page must be greater than or equal to 1.", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100.", 400);
  if (
    props.body.minPrice !== undefined &&
    props.body.minPrice !== null &&
    props.body.maxPrice !== undefined &&
    props.body.maxPrice !== null &&
    props.body.minPrice > props.body.maxPrice
  ) {
    throw new HttpException("minPrice cannot be greater than maxPrice.", 400);
  }
  const where: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
      ? { name: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.category_id !== undefined && props.body.category_id !== null
      ? { shopping_mall_category_id: props.body.category_id }
      : {}),
    ...(props.body.minPrice !== undefined && props.body.minPrice !== null
      ? { base_price: { gte: props.body.minPrice } }
      : {}),
    ...(props.body.maxPrice !== undefined && props.body.maxPrice !== null
      ? { base_price: { lte: props.body.maxPrice } }
      : {}),
    ...(props.body.inStockOnly === true
      ? {
          variants: {
            some: {
              deleted_at: null,
              stock_quantity: { gt: 0 },
            },
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: (sort === "priceAsc"
      ? [
          { base_price: "asc" as const },
          { created_at: "desc" as const },
          { id: "asc" as const },
        ]
      : sort === "priceDesc"
        ? [
            { base_price: "desc" as const },
            { created_at: "desc" as const },
            { id: "asc" as const },
          ]
        : [
            { created_at: "desc" as const },
            { id: "asc" as const },
          ]) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput[],
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
          approval_status: true,
          rejection_reason: true,
          account_status: true,
          approved_at: true,
          rejected_at: true,
          suspended_at: true,
          banned_at: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          sellerProfile: {
            select: {
              id: true,
              shopping_mall_seller_id: true,
              shop_name: true,
              shop_description: true,
              logo_image_url: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          parent: {
            select: {
              id: true,
              parent: {
                select: {
                  id: true,
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
    },
  });
  const total: number = await MyGlobal.prisma.shopping_mall_products.count({
    where,
  });
  return {
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.base_price,
      seller: {
        id: product.seller.id,
        email: product.seller.email,
        approvalStatus: product.seller.approval_status,
        rejectionReason: product.seller.rejection_reason,
        accountStatus: product.seller.account_status,
        approvedAt: product.seller.approved_at?.toISOString() ?? null,
        rejectedAt: product.seller.rejected_at?.toISOString() ?? null,
        suspendedAt: product.seller.suspended_at?.toISOString() ?? null,
        bannedAt: product.seller.banned_at?.toISOString() ?? null,
        lastLoginAt: product.seller.last_login_at?.toISOString() ?? null,
        createdAt: product.seller.created_at.toISOString(),
        updatedAt: product.seller.updated_at.toISOString(),
        deletedAt: product.seller.deleted_at?.toISOString() ?? null,
        sellerProfile: {
          id: product.seller.sellerProfile!.id,
          seller: {
            id: product.seller.id,
            email: product.seller.email,
            approvalStatus: product.seller.approval_status,
            rejectionReason: product.seller.rejection_reason,
            accountStatus: product.seller.account_status,
            approvedAt: product.seller.approved_at?.toISOString() ?? null,
            rejectedAt: product.seller.rejected_at?.toISOString() ?? null,
            suspendedAt: product.seller.suspended_at?.toISOString() ?? null,
            bannedAt: product.seller.banned_at?.toISOString() ?? null,
            lastLoginAt: product.seller.last_login_at?.toISOString() ?? null,
            createdAt: product.seller.created_at.toISOString(),
            updatedAt: product.seller.updated_at.toISOString(),
            deletedAt: product.seller.deleted_at?.toISOString() ?? null,
            sellerProfile: {
              id: product.seller.sellerProfile!.id,
              seller: null as any,
              shopName: product.seller.sellerProfile!.shop_name,
              shopDescription: product.seller.sellerProfile!.shop_description,
              logoImageUrl: product.seller.sellerProfile!.logo_image_url,
              created_at:
                product.seller.sellerProfile!.created_at.toISOString(),
              updated_at:
                product.seller.sellerProfile!.updated_at.toISOString(),
              deleted_at:
                product.seller.sellerProfile!.deleted_at?.toISOString() ?? null,
            },
          },
          shopName: product.seller.sellerProfile!.shop_name,
          shopDescription: product.seller.sellerProfile!.shop_description,
          logoImageUrl: product.seller.sellerProfile!.logo_image_url,
          created_at: product.seller.sellerProfile!.created_at.toISOString(),
          updated_at: product.seller.sellerProfile!.updated_at.toISOString(),
          deleted_at:
            product.seller.sellerProfile!.deleted_at?.toISOString() ?? null,
        } as IShoppingMallSellerProfile.ISummary,
      } as IShoppingMallSeller.ISummary,
      category:
        product.category === null
          ? null
          : ({
              id: product.category.id,
              parent:
                product.category.parent === null
                  ? null
                  : {
                      id: product.category.parent.id,
                      parent: null,
                      name: product.category.parent.name,
                      description: product.category.parent.description,
                      created_at:
                        product.category.parent.created_at.toISOString(),
                      updated_at:
                        product.category.parent.updated_at.toISOString(),
                      deleted_at:
                        product.category.parent.deleted_at?.toISOString() ??
                        null,
                    },
              name: product.category.name,
              description: product.category.description,
              created_at: product.category.created_at.toISOString(),
              updated_at: product.category.updated_at.toISOString(),
              deleted_at: product.category.deleted_at?.toISOString() ?? null,
            } as IShoppingMallCategory.ISummary),
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
      deletedAt: product.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
