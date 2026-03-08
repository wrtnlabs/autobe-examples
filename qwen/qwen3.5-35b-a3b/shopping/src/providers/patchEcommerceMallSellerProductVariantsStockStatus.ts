import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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

export async function patchEcommerceMallSellerProductVariantsStockStatus(props: {
  seller: SellerPayload;
  body: IEcommerceMallProductVariant.IStockStatusRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page: number = 1;
  const limit: number = props.body.pageSize ?? 20;
  const skip: number = 0;
  const whereInput: Prisma.ecommerce_mall_product_variantsWhereInput = {
    deleted_at: null,
    ...(props.body.stockStatus === "in_stock" && {
      stock_quantity: { gt: 0 },
      is_active: true,
    }),
    ...(props.body.stockStatus === "low_stock" && {
      stock_quantity: { gte: 1, lte: 5 },
      is_active: true,
    }),
    ...(props.body.stockStatus === "out_of_stock" && {
      OR: [{ stock_quantity: 0 }, { is_active: false }],
    }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.minStockQuantity !== undefined && {
      stock_quantity: { gte: props.body.minStockQuantity },
    }),
    ...(props.body.maxStockQuantity !== undefined && {
      stock_quantity: { lte: props.body.maxStockQuantity },
    }),
  };
  const sortBy: "stock_quantity" | "sku_code" | "created_at" | "updated_at" =
    props.body.sortBy ?? "stock_quantity";
  const sortOrder: "ASC" | "DESC" = props.body.sortOrder ?? "DESC";
  const orderByInput: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  const data = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
    where: whereInput,
    orderBy: [orderByInput],
    skip,
    take: limit,
    select: {
      id: true,
      sku_code: true,
      stock_quantity: true,
      is_active: true,
      price_override: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          base_price: true,
          is_active: true,
          created_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              rejection_reason: true,
              is_suspended: true,
              is_banned: true,
              created_at: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              is_leaf: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  is_leaf: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereInput,
  });
  const transformedData = data.map((variant) => {
    const displayPrice: number =
      variant.price_override ?? variant.product.base_price;
    return {
      id: variant.id,
      skuCode: variant.sku_code,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        description: variant.product.description ?? null,
        base_price: variant.product.base_price,
        is_active: variant.product.is_active,
        created_at: toISOStringSafe(variant.product.created_at),
        seller: {
          id: variant.product.seller.id,
          email: variant.product.seller.email,
          approval_status: typia.assert<"pending" | "approved" | "rejected">(
            variant.product.seller.approval_status,
          ),
          rejection_reason: variant.product.seller.rejection_reason ?? null,
          is_suspended: variant.product.seller.is_suspended,
          is_banned: variant.product.seller.is_banned,
          created_at: toISOStringSafe(variant.product.seller.created_at),
        },
        category: {
          id: variant.product.category.id,
          name: variant.product.category.name,
          is_leaf: variant.product.category.is_leaf,
          parent:
            variant.product.category.parent !== null
              ? {
                  id: variant.product.category.parent.id,
                  name: variant.product.category.parent.name,
                  is_leaf: variant.product.category.parent.is_leaf,
                  parent: null,
                  created_at: toISOStringSafe(
                    variant.product.category.parent.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    variant.product.category.parent.updated_at,
                  ),
                  deleted_at:
                    variant.product.category.parent.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          variant.product.category.parent.deleted_at,
                        ),
                }
              : null,
          created_at: toISOStringSafe(variant.product.category.created_at),
          updated_at: toISOStringSafe(variant.product.category.updated_at),
          deleted_at:
            variant.product.category.deleted_at === null
              ? null
              : toISOStringSafe(variant.product.category.deleted_at),
        },
      },
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
      priceOverride: variant.price_override,
      displayPrice: displayPrice,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
