import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const {
    title,
    description,
    seller_id,
    business_status,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    order = "desc",
  } = props.body;

  const skip = (page - 1) * limit;

  // Build created_at/updated_at conditions
  const createdAtCond: Record<string, unknown> = {};
  if (created_from) createdAtCond.gte = created_from;
  if (created_to) createdAtCond.lte = created_to;
  const updatedAtCond: Record<string, unknown> = {};
  if (updated_from) updatedAtCond.gte = updated_from;
  if (updated_to) updatedAtCond.lte = updated_to;

  // Build where condition stepwise
  const where = {
    deleted_at: null,
    ...(title ? { title: { contains: title } } : {}),
    ...(description ? { description: { contains: description } } : {}),
    ...(seller_id ? { shopping_mall_seller_id: seller_id } : {}),
    ...(business_status
      ? { business_status }
      : { business_status: { not: "archived" } }),
    ...(Object.keys(createdAtCond).length > 0
      ? { created_at: createdAtCond }
      : {}),
    ...(Object.keys(updatedAtCond).length > 0
      ? { updated_at: updatedAtCond }
      : {}),
  };

  // Calculate sorting
  const orderBy = (() => {
    switch (sort_by) {
      case "title":
        return { title: order };
      case "default_price":
        return { default_price: order };
      case "updated_at":
        return { updated_at: order };
      default:
        return { created_at: order };
    }
  })();

  // Query products, count in parallel
  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        seller: true,
        shopping_mall_products_categories: {
          include: {
            category: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  // Map product summaries
  const data = products.map((prod) => ({
    id: prod.id,
    title: prod.title,
    default_price: prod.default_price,
    business_status: prod.business_status,
    seller: {
      id: prod.seller.id,
      business_name: prod.seller.business_name,
    },
    categories: prod.shopping_mall_products_categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
    })),
    created_at: toISOStringSafe(prod.created_at),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
