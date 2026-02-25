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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAnalyticsSales(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_salesWhereInput = {
    deleted_at: null,
    ...(props.body.name ? { name: { contains: props.body.name } } : {}),
    ...(props.body.categoryCode
      ? {
          category: {
            is: {
              OR: [
                { name: props.body.categoryCode },
                { id: props.body.categoryCode },
              ],
            },
          },
        }
      : {}),
    ...(props.body.price_min !== undefined && props.body.price_min !== null
      ? { base_price: { gte: props.body.price_min } }
      : {}),
    ...(props.body.price_max !== undefined && props.body.price_max !== null
      ? { base_price: { lte: props.body.price_max } }
      : {}),
  };
  if (props.body.inStock === true) {
    // property should be 'sale_units' as camelCase is converted to snake_case
    // Assuming the Prisma model field is sale_units and 'stock_quantity' exists on sale_units
    (where as any).sale_units = { some: { stock_quantity: { gt: 0 } } };
  }
  const orderBy: Prisma.shopping_mall_salesOrderByWithRelationInput =
    props.body.sort === "newest"
      ? { created_at: "desc" }
      : props.body.sort === "price_asc"
        ? { base_price: "asc" }
        : props.body.sort === "price_desc"
          ? { base_price: "desc" }
          : { created_at: "desc" };
  const dataRaw = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where,
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
  const totalRecords = await MyGlobal.prisma.shopping_mall_sales.count({
    where,
  });
  const data = dataRaw.map((sale) => ({
    id: sale.id,
    name: sale.name,
    basePrice: sale.base_price,
    status: sale.status,
    createdAt: toISOStringSafe(sale.created_at),
    updatedAt: toISOStringSafe(sale.updated_at),
    deletedAt:
      sale.deleted_at === null ? null : toISOStringSafe(sale.deleted_at),
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
      created_at: toISOStringSafe(sale.category.created_at),
      updated_at: toISOStringSafe(sale.category.updated_at),
      deleted_at:
        sale.category.deleted_at === null
          ? null
          : toISOStringSafe(sale.category.deleted_at),
    },
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
