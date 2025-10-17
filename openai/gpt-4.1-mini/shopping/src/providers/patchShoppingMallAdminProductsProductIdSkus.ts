import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallSku";
import { IPageIShoppingMallShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingMallSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdSkus(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingMallSku.IRequest;
}): Promise<IPageIShoppingMallShoppingMallSku.ISummary> {
  const { admin, productId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    shopping_mall_product_id: productId,
    ...(body.sku_code !== undefined &&
      body.sku_code !== null && { sku_code: body.sku_code }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.min_price !== undefined &&
      body.min_price !== null && { price: { gte: body.min_price } }),
    ...(body.max_price !== undefined &&
      body.max_price !== null && { price: { lte: body.max_price } }),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_skus.findMany({
      where,
      orderBy: [{ created_at: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        price: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_skus.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items,
  };
}
