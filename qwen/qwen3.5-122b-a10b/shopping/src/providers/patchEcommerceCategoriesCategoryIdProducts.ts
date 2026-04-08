import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductAtSummaryTransformer } from "../transformers/EcommerceProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCategoriesCategoryIdProducts(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  // Validate category exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow({
    where: { id: props.categoryId, deleted_at: null },
  });
  // Build category IDs for filtering (include subcategories if requested)
  let categoryIds: string[] = [props.categoryId];
  if (props.body.include_subcategories === true) {
    const subcategories = await MyGlobal.prisma.ecommerce_categories.findMany({
      where: { parent_id: props.categoryId, deleted_at: null },
      select: { id: true },
    });
    categoryIds = [props.categoryId, ...subcategories.map((s) => s.id)];
  }
  // Build where clause
  const whereInput: Prisma.ecommerce_productsWhereInput = {
    category_id: { in: categoryIds },
    deleted_at: null,
  };
  // Apply search filter (trigram matching on name)
  if (props.body.search) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Apply price range filters
  const priceFilter: {
    gte?: number;
    lte?: number;
  } = {};
  if (props.body.min_price !== undefined) {
    priceFilter.gte = props.body.min_price;
  }
  if (props.body.max_price !== undefined) {
    priceFilter.lte = props.body.max_price;
  }
  if (Object.keys(priceFilter).length > 0) {
    whereInput.base_price = priceFilter;
  }
  // Apply seller filter
  if (props.body.seller_id) {
    whereInput.seller_id = props.body.seller_id;
  }
  // Apply in_stock_only filter (removed stock field as it doesn't exist in schema)
  if (props.body.in_stock_only === true) {
    whereInput.variants = {
      some: {
        inventoryRecords: {
          some: {},
        },
      },
    };
  }
  const where = whereInput satisfies Prisma.ecommerce_productsWhereInput;
  // Build order by
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_productsOrderByWithRelationInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch products
  const records = await MyGlobal.prisma.ecommerce_products.findMany({
    where,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceProductAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_products.count({ where });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceProductAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIEcommerceProduct.ISummary;
}
