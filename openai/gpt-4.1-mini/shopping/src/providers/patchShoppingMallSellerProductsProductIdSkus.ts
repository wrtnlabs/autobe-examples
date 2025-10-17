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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingMallSku.IRequest;
}): Promise<IPageIShoppingMallShoppingMallSku.ISummary> {
  const { seller, productId, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: { id: true, shopping_mall_seller_id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Unauthorized: Not your product", 403);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    shopping_mall_product_id: productId,
    ...(body.sku_code !== undefined &&
      body.sku_code !== null && {
        sku_code: { contains: body.sku_code },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.min_price !== undefined &&
      body.min_price !== null && {
        price: {
          gte: body.min_price,
          ...(body.max_price !== undefined &&
            body.max_price !== null && { lte: body.max_price }),
        },
      }),
    ...(body.min_price === undefined &&
      body.max_price !== undefined &&
      body.max_price !== null && {
        price: {
          lte: body.max_price,
        },
      }),
  };

  const [skus, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_skus.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        price: true,
        status: true,
        weight: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_skus.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data: skus.map((sku) => ({
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      status: sku.status,
      weight: sku.weight === null ? undefined : sku.weight,
    })),
  };
}
