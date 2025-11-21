import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const searchQuery = props.body.trim();

  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Build dynamic where clause with search and status filtering
  const whereClause: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    status: "published",
  };

  if (searchQuery && searchQuery.length > 0) {
    whereClause.title = { contains: searchQuery, mode: "insensitive" };
  }

  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where: whereClause }),
  ]);

  const productsSummary = products.map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    status: product.status,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: productsSummary,
  };
}
