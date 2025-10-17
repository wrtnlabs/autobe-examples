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
  const { body } = props;

  const pageNum = body.page > 0 ? body.page : 1;
  const limitNum = body.limit > 0 ? body.limit : 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    deleted_at: null,
    ...(body.shopping_mall_category_id !== undefined &&
      body.shopping_mall_category_id !== null && {
        shopping_mall_category_id: body.shopping_mall_category_id,
      }),
    ...(body.shopping_mall_seller_id !== undefined &&
      body.shopping_mall_seller_id !== null && {
        shopping_mall_seller_id: body.shopping_mall_seller_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.code !== undefined &&
      body.code !== null && {
        code: { contains: body.code },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limitNum,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        shopping_mall_category_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  const pages = Math.ceil(total / limitNum);

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages,
    },
    data: results.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      status: product.status,
      shopping_mall_category_id: product.shopping_mall_category_id,
    })),
  };
}
