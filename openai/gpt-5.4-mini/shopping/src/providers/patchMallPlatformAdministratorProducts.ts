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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProducts(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformProduct.IRequest;
}): Promise<IPageIMallPlatformProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  if (props.body.minPrice !== undefined && props.body.maxPrice !== undefined) {
    if (props.body.minPrice > props.body.maxPrice) {
      throw new HttpException("Minimum price cannot exceed maximum price", 400);
    }
  }
  if (props.body.categoryId !== undefined) {
    await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
      select: { id: true },
    });
  }
  const where: Prisma.mall_platform_productsWhereInput = {
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
  };
  const orderBy: Prisma.mall_platform_productsOrderByWithRelationInput =
    props.body.sort === "priceAsc"
      ? { base_price: "asc" }
      : props.body.sort === "priceDesc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const records = await MyGlobal.prisma.mall_platform_products.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
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
          parentCategory: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const recordsCount: number =
    await MyGlobal.prisma.mall_platform_products.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    },
    data: await ArrayUtil.asyncMap(records, async (record) => ({
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
            : record.sellerAccount.suspended_at.toISOString(),
        deletedAt:
          record.sellerAccount.deleted_at === null
            ? null
            : record.sellerAccount.deleted_at.toISOString(),
        createdAt: record.sellerAccount.created_at.toISOString(),
        updatedAt: record.sellerAccount.updated_at.toISOString(),
      },
      category:
        record.category === null
          ? null
          : {
              id: record.category.id,
              parentCategory: null,
              name: record.category.name,
              description: record.category.description,
              createdAt: record.category.created_at.toISOString(),
              updatedAt: record.category.updated_at.toISOString(),
              deletedAt:
                record.category.deleted_at === null
                  ? null
                  : record.category.deleted_at.toISOString(),
            },
      createdAt: record.created_at.toISOString(),
      updatedAt: record.updated_at.toISOString(),
      deletedAt:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
  };
}
