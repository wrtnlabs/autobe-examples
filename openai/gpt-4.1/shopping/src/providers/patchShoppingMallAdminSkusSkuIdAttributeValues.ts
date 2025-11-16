import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import { IPageIShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttributeValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSkusSkuIdAttributeValues(props: {
  admin: AdminPayload;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttributeValue.IRequest;
}): Promise<IPageIShoppingMallProductAttributeValue.ISummary> {
  // 1. Check SKU existence (with soft delete awareness)
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      deleted_at: null,
    },
    include: {
      product: {
        include: {
          seller: true,
          shopping_mall_products_categories: {
            include: { category: true },
          },
        },
      },
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  // 2. Build filters
  const whereCondition: any = {
    shopping_mall_product_sku_id: props.skuId,
  };
  if (props.body.attribute_id) {
    whereCondition.shopping_mall_product_attribute_id = props.body.attribute_id;
  }
  if (props.body.value_display_name) {
    whereCondition.value_display_name = {
      contains: props.body.value_display_name,
    };
  }

  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // 3. Query (findMany with joins for enrichment, plus count)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_attribute_values.findMany({
      where: whereCondition,
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
      include: {
        sku: true,
        attribute: {
          include: {
            product: {
              include: {
                seller: true,
                shopping_mall_products_categories: {
                  include: { category: true },
                },
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_product_attribute_values.count({
      where: whereCondition,
    }),
  ]);

  // 4. Assemble results with all joins and format conversions
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      value_display_name: row.value_display_name,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      sku: {
        id: row.sku.id,
        code: row.sku.sku_code,
        product_title: sku.product.title,
        option_summary: "", // Option summary not in schema; blank unless otherwise defined
        in_stock: row.sku.stock > 0 && row.sku.status === "active",
      },
      attribute: {
        id: row.attribute.id,
        product: {
          id: row.attribute.product.id,
          title: row.attribute.product.title,
          default_price: row.attribute.product.default_price,
          business_status: row.attribute.product.business_status,
          seller: {
            id: row.attribute.product.seller.id,
            business_name: row.attribute.product.seller.business_name,
          },
          categories:
            row.attribute.product.shopping_mall_products_categories.map(
              (cat) => ({
                id: cat.category.id,
                name: cat.category.name,
              }),
            ),
          created_at: toISOStringSafe(row.attribute.product.created_at),
        },
        attribute_name: row.attribute.attribute_name,
        position: row.attribute.position,
        created_at: toISOStringSafe(row.attribute.created_at),
        updated_at: toISOStringSafe(row.attribute.updated_at),
        deleted_at: row.attribute.deleted_at
          ? toISOStringSafe(row.attribute.deleted_at)
          : undefined,
      },
    })),
  };
}
