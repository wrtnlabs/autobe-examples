import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductCodeSkus(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  const { seller, productCode, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: productCode,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereClause = {
    shopping_mall_product_id: product.id,
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? {
          OR: [
            { sku_code: { contains: body.search } },
            { attributes_json: { contains: body.search } },
          ],
        }
      : {}),
  };

  const validSortFields = ["price", "sku_code", "created_at", "updated_at"];
  const sortField =
    body.sortField && validSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";
  const sortDirection =
    body.sortOrder && (body.sortOrder === "asc" || body.sortOrder === "desc")
      ? body.sortOrder
      : "desc";

  const orderByClause = { [sortField]: sortDirection };

  const [skus, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: skip,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        price: true,
        attributes_json: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.count({ where: whereClause }),
  ]);

  const data = skus.map((sku) => ({
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    attributes_json:
      sku.attributes_json === null ? undefined : sku.attributes_json,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
