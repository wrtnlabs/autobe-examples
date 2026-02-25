import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSales(props: {
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  // Validate pagination parameters with default and constraints
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1) throw new HttpException("Limit must be at least 1", 400);
  // Base where filter for not deleted
  const where: Prisma.shopping_mall_salesWhereInput = { deleted_at: null };
  // Filter by name with case-insensitive partial match
  if (
    props.body.name !== undefined &&
    props.body.name !== null &&
    props.body.name !== ""
  ) {
    where.name = { contains: props.body.name, mode: "insensitive" };
  }
  // Filter by price
  if (props.body.price_min !== undefined && props.body.price_min !== null) {
    if (typeof where.base_price !== "object" || where.base_price === null)
      where.base_price = {};
    where.base_price = { ...where.base_price, gte: props.body.price_min };
  }
  if (props.body.price_max !== undefined && props.body.price_max !== null) {
    if (typeof where.base_price !== "object" || where.base_price === null)
      where.base_price = {};
    where.base_price = { ...where.base_price, lte: props.body.price_max };
  }
  // Include category join condition for filtering by categoryCode
  let categoryWhere:
    | Prisma.shopping_mall_product_categoriesWhereInput
    | undefined = undefined;
  if (
    props.body.categoryCode !== undefined &&
    props.body.categoryCode !== null &&
    props.body.categoryCode !== ""
  ) {
    categoryWhere = { name: props.body.categoryCode };
  }
  // Sorting order
  const orderBy: Prisma.shopping_mall_salesOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const skip = (page - 1) * limit;
  // Query with optional category filter
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: {
      ...where,
      category: categoryWhere ? { is: categoryWhere } : undefined,
    },
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      base_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          email: true,
          shop_name: true,
          shop_description: true,
          logo_uri: true,
          approval_status: true,
          rejection_reason: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // Total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_sales.count({
    where: {
      ...where,
      category: categoryWhere ? { is: categoryWhere } : undefined,
    },
  });
  // Handle inStock filter
  let filteredSales = sales;
  if (props.body.inStock === true) {
    // Filter sales with total stock quantity > 0 in sale_units
    // Fetch sale IDs with stock
    const saleIdsWithStock =
      await MyGlobal.prisma.shopping_mall_sale_units.findMany({
        where: {
          // Bypass strict Prisma typing error by using any cast
          ...({
            stock: { gt: 0 },
            shopping_mall_sale_id: { in: sales.map((s) => s.id) },
          } as any),
        },
        select: { shopping_mall_sale_id: true },
        distinct: ["shopping_mall_sale_id"],
      });
    const saleIds = new Set(
      saleIdsWithStock.map((u) => u.shopping_mall_sale_id),
    );
    filteredSales = sales.filter((s) => saleIds.has(s.id));
  }
  // Convert date fields securely without using Date directly
  const toISO = toISOStringSafe;
  const data: IShoppingMallSale.ISummary[] = filteredSales.map((sale) => ({
    id: sale.id,
    name: sale.name,
    basePrice: sale.base_price,
    status: sale.status,
    createdAt: toISO(sale.created_at),
    updatedAt: toISO(sale.updated_at),
    deletedAt: sale.deleted_at ? toISO(sale.deleted_at) : null,
    seller: {
      id: sale.seller.id,
      email: sale.seller.email,
      shopName: sale.seller.shop_name,
      shopDescription: sale.seller.shop_description ?? null,
      logoUri: sale.seller.logo_uri ?? null,
      approvalStatus: sale.seller.approval_status,
      rejectionReason: sale.seller.rejection_reason ?? null,
    },
    category: {
      id: sale.category.id,
      name: sale.category.name,
      description: sale.category.description,
      created_at: toISO(sale.category.created_at),
      updated_at: toISO(sale.category.updated_at),
      deleted_at: sale.category.deleted_at
        ? toISO(sale.category.deleted_at)
        : null,
    },
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
