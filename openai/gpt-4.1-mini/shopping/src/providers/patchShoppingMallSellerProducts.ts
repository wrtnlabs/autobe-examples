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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1) < 1 ? 1 : Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20) < 1 ? 20 : Number(body.limit ?? 20);

  const where = {
    ...(body.include_deleted === true ? {} : { deleted_at: null }),
    ...(body.brand !== undefined && body.brand !== null
      ? { brand: { contains: body.brand } }
      : {}),
    ...(body.search_text !== undefined && body.search_text !== null
      ? {
          OR: [
            { name: { contains: body.search_text } },
            { code: { contains: body.search_text } },
            { description: { contains: body.search_text } },
            { brand: { contains: body.search_text } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
    })),
  };
}
