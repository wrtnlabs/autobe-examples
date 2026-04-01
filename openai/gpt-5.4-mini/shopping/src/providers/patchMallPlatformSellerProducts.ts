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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProducts(props: {
  seller: SellerPayload;
  body: IMallPlatformProduct.IRequest;
}): Promise<IPageIMallPlatformProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "newest" &&
    props.body.sort !== "priceAsc" &&
    props.body.sort !== "priceDesc"
  ) {
    throw new HttpException("Unsupported sort criteria", 400);
  }
  if (
    props.body.minPrice !== undefined &&
    props.body.maxPrice !== undefined &&
    props.body.minPrice > props.body.maxPrice
  ) {
    throw new HttpException("Invalid price bounds", 400);
  }
  if (props.body.categoryId !== undefined) {
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
      select: { id: true },
    });
  }
  const where = {
    deleted_at: null,
    ...(props.body.categoryId !== undefined
      ? { category_id: props.body.categoryId }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
    ...(props.body.minPrice !== undefined || props.body.maxPrice !== undefined
      ? {
          base_price:
            props.body.minPrice !== undefined &&
            props.body.maxPrice !== undefined
              ? { gte: props.body.minPrice, lte: props.body.maxPrice }
              : props.body.minPrice !== undefined
                ? { gte: props.body.minPrice }
                : { lte: props.body.maxPrice },
        }
      : {}),
  } satisfies Prisma.mall_platform_productsWhereInput;
  const orderBy = (
    props.body.sort === "priceAsc"
      ? { base_price: "asc" as const }
      : props.body.sort === "priceDesc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.mall_platform_productsOrderByWithRelationInput;
  const rows = await MyGlobal.prisma.mall_platform_products.findMany({
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
              parentCategory: {
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
  const total = await MyGlobal.prisma.mall_platform_products.count({ where });
  return {
    data: await ArrayUtil.asyncMap(rows, async (row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      basePrice: row.base_price,
      sellerAccount: {
        id: row.sellerAccount.id,
        email: row.sellerAccount.email,
        approvalStatus: row.sellerAccount.approval_status,
        rejectionReason: row.sellerAccount.rejection_reason,
        suspendedAt: toISOStringSafe(
          row.sellerAccount.suspended_at ??
            new Date("9999-12-31T23:59:59.999Z"),
        ),
        deletedAt: toISOStringSafe(
          row.sellerAccount.deleted_at ?? new Date("9999-12-31T23:59:59.999Z"),
        ),
        createdAt: toISOStringSafe(row.sellerAccount.created_at),
        updatedAt: toISOStringSafe(row.sellerAccount.updated_at),
      },
      category:
        row.category === null
          ? null
          : {
              id: row.category.id,
              parentCategory:
                row.category.parentCategory === null
                  ? null
                  : {
                      id: row.category.parentCategory.id,
                      parentCategory: null,
                      name: row.category.parentCategory.name,
                      description: row.category.parentCategory.description,
                      createdAt: toISOStringSafe(
                        row.category.parentCategory.created_at,
                      ),
                      updatedAt: toISOStringSafe(
                        row.category.parentCategory.updated_at,
                      ),
                      deletedAt: toISOStringSafe(
                        row.category.parentCategory.deleted_at ??
                          new Date("9999-12-31T23:59:59.999Z"),
                      ),
                    },
              name: row.category.name,
              description: row.category.description,
              createdAt: toISOStringSafe(row.category.created_at),
              updatedAt: toISOStringSafe(row.category.updated_at),
              deletedAt: toISOStringSafe(
                row.category.deleted_at ?? new Date("9999-12-31T23:59:59.999Z"),
              ),
            },
      createdAt: toISOStringSafe(row.created_at),
      updatedAt: toISOStringSafe(row.updated_at),
      deletedAt: toISOStringSafe(
        row.deleted_at ?? new Date("9999-12-31T23:59:59.999Z"),
      ),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
