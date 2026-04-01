import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
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

export async function patchMallPlatformAdministratorProductVariantsProductVariantIdInventoryRecords(props: {
  administrator: AdministratorPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IMallPlatformInventoryRecord.IRequest;
}): Promise<IPageIMallPlatformInventoryRecord.ISummary> {
  await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
    where: {
      id: props.productVariantId,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_inventory_recordsWhereInput = {
    mall_platform_product_variant_id: props.productVariantId,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          reason: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.reason !== undefined && props.body.reason.length > 0
      ? {
          reason: {
            contains: props.body.reason,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.quantityDirection === "positive"
      ? { quantity_change: { gt: 0 } }
      : props.body.quantityDirection === "negative"
        ? { quantity_change: { lt: 0 } }
        : {}),
    ...(props.body.createdAtFrom !== undefined
      ? { created_at: { gte: new Date(props.body.createdAtFrom) } }
      : {}),
    ...(props.body.createdAtTo !== undefined
      ? { created_at: { lte: new Date(props.body.createdAtTo) } }
      : {}),
  };
  const orderBy: Prisma.mall_platform_inventory_recordsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "quantityAsc"
        ? { quantity_change: "asc" }
        : props.body.sort === "quantityDesc"
          ? { quantity_change: "desc" }
          : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.mall_platform_inventory_records.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price_override: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            product: {
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
            },
          },
        },
      },
    });
  const total: number =
    await MyGlobal.prisma.mall_platform_inventory_records.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      async (record) =>
        ({
          id: record.id,
          productVariant: {
            id: record.productVariant.id,
            skuCode: record.productVariant.sku_code,
            optionValues: record.productVariant.option_values,
            priceOverride: record.productVariant.price_override,
            isActive: record.productVariant.is_active,
            product: {
              id: record.productVariant.product.id,
              name: record.productVariant.product.name,
              description: record.productVariant.product.description,
              basePrice: record.productVariant.product.base_price,
              sellerAccount: {
                id: record.productVariant.product.sellerAccount.id,
                email: record.productVariant.product.sellerAccount.email,
                approvalStatus:
                  record.productVariant.product.sellerAccount.approval_status,
                rejectionReason:
                  record.productVariant.product.sellerAccount.rejection_reason,
                suspendedAt:
                  record.productVariant.product.sellerAccount.suspended_at?.toISOString() ??
                  null,
                deletedAt:
                  record.productVariant.product.sellerAccount.deleted_at?.toISOString() ??
                  null,
                createdAt:
                  record.productVariant.product.sellerAccount.created_at.toISOString(),
                updatedAt:
                  record.productVariant.product.sellerAccount.updated_at.toISOString(),
              } satisfies IMallPlatformSellerAccount.ISummary,
              category:
                record.productVariant.product.category === null
                  ? null
                  : ({
                      id: record.productVariant.product.category.id,
                      parentCategory:
                        record.productVariant.product.category
                          .parentCategory === null
                          ? null
                          : ({
                              id: record.productVariant.product.category
                                .parentCategory.id,
                              parentCategory: null,
                              name: record.productVariant.product.category
                                .parentCategory.name,
                              description:
                                record.productVariant.product.category
                                  .parentCategory.description,
                              createdAt:
                                record.productVariant.product.category.parentCategory.created_at.toISOString(),
                              updatedAt:
                                record.productVariant.product.category.parentCategory.updated_at.toISOString(),
                              deletedAt:
                                record.productVariant.product.category.parentCategory.deleted_at?.toISOString() ??
                                null,
                            } satisfies IMallPlatformCategory.ISummary),
                      name: record.productVariant.product.category.name,
                      description:
                        record.productVariant.product.category.description,
                      createdAt:
                        record.productVariant.product.category.created_at.toISOString(),
                      updatedAt:
                        record.productVariant.product.category.updated_at.toISOString(),
                      deletedAt:
                        record.productVariant.product.category.deleted_at?.toISOString() ??
                        null,
                    } satisfies IMallPlatformCategory.ISummary | null),
              createdAt: record.productVariant.product.created_at.toISOString(),
              updatedAt: record.productVariant.product.updated_at.toISOString(),
              deletedAt:
                record.productVariant.product.deleted_at?.toISOString() ?? null,
            } satisfies IMallPlatformProduct.ISummary,
            createdAt: record.productVariant.created_at.toISOString(),
            updatedAt: record.productVariant.updated_at.toISOString(),
            deletedAt: record.productVariant.deleted_at?.toISOString() ?? null,
          } satisfies IMallPlatformProductVariant.ISummary,
          quantityChange: record.quantity_change,
          reason: record.reason,
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
          deletedAt: record.deleted_at?.toISOString() ?? null,
        }) satisfies IMallPlatformInventoryRecord.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
