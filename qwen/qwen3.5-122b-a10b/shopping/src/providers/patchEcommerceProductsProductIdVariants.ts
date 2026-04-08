import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductVariantAtSummaryTransformer } from "../transformers/EcommerceProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IRequest;
}): Promise<IPageIEcommerceProductVariant.ISummary> {
  // Verify product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * clampedLimit;
  // Build where clause
  const whereInput: Prisma.ecommerce_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
  };
  // Apply sku_code filter (partial match, case-insensitive)
  if (props.body.sku_code !== undefined && props.body.sku_code !== "") {
    whereInput.sku_code = {
      contains: props.body.sku_code,
      mode: "insensitive",
    };
  }
  // Apply option_values filter (key=value;key=value format)
  if (props.body.option_values !== undefined) {
    const optionPairs = Object.entries(props.body.option_values);
    if (optionPairs.length > 0) {
      whereInput.option_values = {
        contains: optionPairs
          .map(([key, value]) => `${key}=${value}`)
          .join(";"),
      };
    }
  }
  // Apply in_stock filter (requires subquery aggregation)
  if (props.body.in_stock !== undefined) {
    if (props.body.in_stock === true) {
      // In stock: has inventory records with positive total
      whereInput.inventoryRecords = {
        some: {
          quantity_change: {
            gt: 0,
          },
        },
      };
    } else {
      // Out of stock: no inventory records or total <= 0
      whereInput.OR = [
        {
          inventoryRecords: {
            none: {},
          },
        },
        {
          AND: [
            {
              inventoryRecords: {
                some: {},
              },
            },
            {
              NOT: {
                inventoryRecords: {
                  some: {
                    quantity_change: {
                      gt: 0,
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }
  }
  // Build orderBy
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? (sort === "created_at" ? "desc" : "asc");
  const allowedSorts = ["sku_code", "price", "created_at"];
  const allowedOrders = ["asc", "desc"];
  if (!allowedSorts.includes(sort)) {
    throw new HttpException(`Invalid sort field: ${sort}`, 400);
  }
  if (!allowedOrders.includes(order)) {
    throw new HttpException(`Invalid order: ${order}`, 400);
  }
  const orderByInput: Prisma.ecommerce_product_variantsOrderByWithRelationInput =
    sort === "sku_code"
      ? { sku_code: order }
      : sort === "price"
        ? { price: order }
        : { created_at: order };
  // Fetch variants with stock calculation using transformer select
  const variants = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: clampedLimit,
    ...EcommerceProductVariantAtSummaryTransformer.select(),
  });
  // Calculate total count
  const total = await MyGlobal.prisma.ecommerce_product_variants.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    variants,
    EcommerceProductVariantAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: clampedLimit,
      records: total,
      pages: Math.ceil(total / clampedLimit),
    },
    data,
  } satisfies IPageIEcommerceProductVariant.ISummary;
}
