import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import { IPageIShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingProducts(props: {
  body: IShoppingProduct.IRequest;
}): Promise<IPageIShoppingProduct.ISummary> {
  const body = props.body;
  const filters: Record<string, any> = {
    deleted_at: null,
    status: body.status ?? "active",
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && { shopping_seller_id: body.seller_id }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
  };

  // Name/description keyword search (case-insensitive, SQLite compatible)
  if (body.keyword !== undefined && body.keyword !== null) {
    filters.OR = [
      { name: { contains: body.keyword } },
      { description: { contains: body.keyword } },
    ];
  }

  // Product must have at least one active SKU
  filters.skus = {
    some: {
      is_active: true,
      ...(body.sku_code !== undefined &&
        body.sku_code !== null && { sku_code: body.sku_code }),
      ...(body.min_price !== undefined &&
        body.min_price !== null && { price: { gte: body.min_price } }),
      ...(body.max_price !== undefined &&
        body.max_price !== null && { price: { lte: body.max_price } }),
    },
  };

  // Category filter (by id or code)
  if (
    (body.category_id !== undefined && body.category_id !== null) ||
    (body.category_code !== undefined && body.category_code !== null)
  ) {
    filters.shopping_category_product_assignments = {
      some:
        body.category_id !== undefined && body.category_id !== null
          ? { shopping_category_id: body.category_id }
          : { category: { category_code: body.category_code } },
    };
  }

  // Tag filter
  if (body.tag_code !== undefined && body.tag_code !== null) {
    filters.shopping_product_tag_assignments = {
      some: { tag: { tag_code: body.tag_code } },
    };
  }

  // Attribute dimension/value filter
  if (
    (body.attribute_dimension_code !== undefined &&
      body.attribute_dimension_code !== null) ||
    (body.attribute_value_code !== undefined &&
      body.attribute_value_code !== null)
  ) {
    filters.shopping_product_attributes = {
      some: {
        ...(body.attribute_dimension_code !== undefined &&
          body.attribute_dimension_code !== null && {
            attributeValue: {
              attributeDimension: {
                dimension_code: body.attribute_dimension_code,
              },
            },
          }),
        ...(body.attribute_value_code !== undefined &&
          body.attribute_value_code !== null && {
            attributeValue: { value_code: body.attribute_value_code },
          }),
      },
    };
  }

  // Sorting
  let orderBy: any = { created_at: "desc" };
  if (body.sort_by === "name") {
    orderBy = { name: body.sort_direction === "asc" ? "asc" : "desc" };
  } else if (body.sort_by === "created_at") {
    orderBy = { created_at: body.sort_direction === "asc" ? "asc" : "desc" };
  }
  // Note: Sorting by price, rating, review_count not supported in this view (requires extra aggregation/join)

  // Pagination
  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_products.count({ where: filters }),
    MyGlobal.prisma.shopping_products.findMany({
      where: filters,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        main_image_uri: true,
        status: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      main_image_uri:
        row.main_image_uri !== undefined && row.main_image_uri !== null
          ? row.main_image_uri
          : null,
      status: row.status,
    })),
  };
}
