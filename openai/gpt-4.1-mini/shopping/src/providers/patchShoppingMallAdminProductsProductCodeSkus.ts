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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductCodeSkus(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  const { admin, productCode, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: productCode },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const where = {
    shopping_mall_product_id: product.id,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { sku_code: { contains: body.search } },
          { attributes_json: { contains: body.search } },
        ],
      }),
  };

  const allowedSortFields = new Set([
    "sku_code",
    "price",
    "created_at",
    "updated_at",
  ]);

  const orderBy =
    body.sortField && allowedSortFields.has(body.sortField)
      ? {
          [body.sortField]: (body.sortOrder === "asc"
            ? "asc"
            : "desc") satisfies "asc" | "desc" as "asc" | "desc",
        }
      : { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" };

  const page = Number(body.page) < 1 ? 1 : Number(body.page);
  const limit = Number(body.limit) < 1 ? 10 : Number(body.limit);
  const skip = (page - 1) * limit;

  const [skus, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where,
      orderBy,
      skip,
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
    MyGlobal.prisma.shopping_mall_product_skus.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: skus.map((sku) => ({
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      attributes_json: sku.attributes_json ?? undefined,
      created_at: toISOStringSafe(sku.created_at),
      updated_at: toISOStringSafe(sku.updated_at),
    })),
  };
}
