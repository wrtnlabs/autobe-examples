import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductsProductIdSkus(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallSku.IRequest;
}): Promise<IPageIShoppingMallSku> {
  const { productId, body } = props;

  const page = body.page ?? 0;
  const limit = 20;
  const skip = page * limit;

  const [skus, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_skus.findMany({
      where: {
        shopping_mall_product_id: productId,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_skus.count({
      where: {
        shopping_mall_product_id: productId,
      },
    }),
  ]);

  const data: IShoppingMallSku[] = skus.map((sku) => ({
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data: data,
  };
}
