import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
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

export async function patchMallPlatformAdministratorProductsProductIdVariants(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.IRequest;
}): Promise<IPageIMallPlatformProductVariant.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const order: "asc" | "desc" = props.body.order ?? "desc";
  const sort: string = props.body.sort ?? "createdAt";
  const where: Prisma.mall_platform_product_variantsWhereInput = {
    mall_platform_product_id: props.productId,
    ...(props.body.isActive !== undefined
      ? { is_active: props.body.isActive }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_product_variantsOrderByWithRelationInput =
    sort === "skuCode"
      ? { sku_code: order }
      : sort === "optionValues"
        ? { option_values: order }
        : sort === "isActive"
          ? { is_active: order }
          : sort === "updatedAt"
            ? { updated_at: order }
            : { created_at: order };
  const data = await MyGlobal.prisma.mall_platform_product_variants.findMany({
    where,
    skip,
    take: limit,
    orderBy,
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
  });
  const total: number =
    await MyGlobal.prisma.mall_platform_product_variants.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(data, async (variant) => ({
      id: variant.id,
      skuCode: variant.sku_code,
      optionValues: variant.option_values,
      priceOverride: variant.price_override,
      isActive: variant.is_active,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        description: variant.product.description,
        basePrice: variant.product.base_price,
        sellerAccount: {
          id: variant.product.sellerAccount.id,
          email: variant.product.sellerAccount.email,
          approvalStatus: variant.product.sellerAccount.approval_status,
          rejectionReason: variant.product.sellerAccount.rejection_reason,
          suspendedAt:
            variant.product.sellerAccount.suspended_at?.toISOString() ?? null,
          deletedAt:
            variant.product.sellerAccount.deleted_at?.toISOString() ?? null,
          createdAt: variant.product.sellerAccount.created_at.toISOString(),
          updatedAt: variant.product.sellerAccount.updated_at.toISOString(),
        },
        category:
          variant.product.category === null
            ? null
            : {
                id: variant.product.category.id,
                parentCategory:
                  variant.product.category.parentCategory === null
                    ? null
                    : {
                        id: variant.product.category.parentCategory.id,
                        parentCategory: null,
                        name: variant.product.category.parentCategory.name,
                        description:
                          variant.product.category.parentCategory.description,
                        createdAt:
                          variant.product.category.parentCategory.created_at.toISOString(),
                        updatedAt:
                          variant.product.category.parentCategory.updated_at.toISOString(),
                        deletedAt:
                          variant.product.category.parentCategory.deleted_at?.toISOString() ??
                          null,
                      },
                name: variant.product.category.name,
                description: variant.product.category.description,
                createdAt: variant.product.category.created_at.toISOString(),
                updatedAt: variant.product.category.updated_at.toISOString(),
                deletedAt:
                  variant.product.category.deleted_at?.toISOString() ?? null,
              },
        createdAt: variant.product.created_at.toISOString(),
        updatedAt: variant.product.updated_at.toISOString(),
        deletedAt: variant.product.deleted_at?.toISOString() ?? null,
      },
      createdAt: variant.created_at.toISOString(),
      updatedAt: variant.updated_at.toISOString(),
      deletedAt: variant.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
