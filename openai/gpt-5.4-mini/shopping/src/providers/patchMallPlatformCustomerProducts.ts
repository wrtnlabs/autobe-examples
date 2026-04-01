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

export async function patchMallPlatformCustomerProducts(props: {
  customer: CustomerPayload;
  body: IMallPlatformProduct.IRequest;
}): Promise<IPageIMallPlatformProduct.ISummary> {
  if (
    props.body.minPrice !== undefined &&
    props.body.maxPrice !== undefined &&
    props.body.minPrice > props.body.maxPrice
  ) {
    throw new HttpException("Invalid price range", 400);
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "newest" &&
    props.body.sort !== "priceAsc" &&
    props.body.sort !== "priceDesc"
  ) {
    throw new HttpException("Unsupported sort criteria", 400);
  }
  if (props.body.categoryId !== undefined) {
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
      select: { id: true },
    });
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.categoryId !== undefined
      ? { category_id: props.body.categoryId }
      : {}),
    ...(props.body.minPrice !== undefined || props.body.maxPrice !== undefined
      ? {
          base_price: {
            ...(props.body.minPrice !== undefined
              ? { gte: props.body.minPrice }
              : {}),
            ...(props.body.maxPrice !== undefined
              ? { lte: props.body.maxPrice }
              : {}),
          },
        }
      : {}),
    ...(props.body.inStockOnly === true
      ? {
          variants: {
            some: {
              deleted_at: null,
              is_active: true,
            },
          },
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_productsOrderByWithRelationInput =
    props.body.sort === "priceAsc"
      ? { base_price: "asc" }
      : props.body.sort === "priceDesc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const records = await MyGlobal.prisma.mall_platform_products.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
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
  const total: number = await MyGlobal.prisma.mall_platform_products.count({
    where,
  });
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: await ArrayUtil.asyncMap(
      records,
      async (record) =>
        ({
          id: record.id,
          name: record.name,
          description: record.description,
          basePrice: record.base_price,
          sellerAccount: {
            id: record.sellerAccount.id,
            email: record.sellerAccount.email,
            approvalStatus: record.sellerAccount.approval_status,
            rejectionReason: record.sellerAccount.rejection_reason,
            suspendedAt:
              record.sellerAccount.suspended_at === null
                ? null
                : toISOStringSafe(record.sellerAccount.suspended_at),
            deletedAt:
              record.sellerAccount.deleted_at === null
                ? null
                : toISOStringSafe(record.sellerAccount.deleted_at),
            createdAt: toISOStringSafe(record.sellerAccount.created_at),
            updatedAt: toISOStringSafe(record.sellerAccount.updated_at),
          },
          category:
            record.category === null
              ? null
              : ({
                  id: record.category.id,
                  parentCategory:
                    record.category.parentCategory === null
                      ? null
                      : ({
                          id: record.category.parentCategory.id,
                          parentCategory: null,
                          name: record.category.parentCategory.name,
                          description:
                            record.category.parentCategory.description,
                          createdAt: toISOStringSafe(
                            record.category.parentCategory.created_at,
                          ),
                          updatedAt: toISOStringSafe(
                            record.category.parentCategory.updated_at,
                          ),
                          deletedAt:
                            record.category.parentCategory.deleted_at === null
                              ? null
                              : toISOStringSafe(
                                  record.category.parentCategory.deleted_at,
                                ),
                        } satisfies IMallPlatformCategory.ISummary),
                  name: record.category.name,
                  description: record.category.description,
                  createdAt: toISOStringSafe(record.category.created_at),
                  updatedAt: toISOStringSafe(record.category.updated_at),
                  deletedAt:
                    record.category.deleted_at === null
                      ? null
                      : toISOStringSafe(record.category.deleted_at),
                } satisfies IMallPlatformCategory.ISummary),
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt:
            record.deleted_at === null
              ? null
              : toISOStringSafe(record.deleted_at),
        }) satisfies IMallPlatformProduct.ISummary,
    ),
    pagination,
  } satisfies IPageIMallPlatformProduct.ISummary;
}
