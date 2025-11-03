import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IPageIShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerProductsProductCodeSkus(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingSku.IRequest;
}): Promise<IPageIShoppingSku.ISummary> {
  const { seller, productCode, body } = props;
  // Check product ownership and existence
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: productCode,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {
    shopping_product_id: product.id,
    deleted_at: null,
  };
  if (body.is_active !== undefined) {
    where.is_active = body.is_active;
  }
  if (body.status !== undefined) {
    where.status = body.status;
  }
  if (body.search) {
    where.OR = [
      { sku_code: { contains: body.search } },
      { barcode: { contains: body.search } },
    ];
  }
  if (body.barcode) {
    where.barcode = { contains: body.barcode };
  }
  if (body.min_price !== undefined && body.max_price !== undefined) {
    where.price = { gte: body.min_price, lte: body.max_price };
  } else if (body.min_price !== undefined) {
    where.price = { gte: body.min_price };
  } else if (body.max_price !== undefined) {
    where.price = { lte: body.max_price };
  }

  const allowedSort = ["created_at", "price", "sku_code", "status"] as const;
  type AllowedSort = (typeof allowedSort)[number];
  const sortField = allowedSort.includes(body.sort_by as AllowedSort)
    ? (body.sort_by as AllowedSort)
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_skus.count({ where }),
    MyGlobal.prisma.shopping_skus.findMany({
      where,
      orderBy:
        sortField === "created_at"
          ? { created_at: sortOrder as "asc" | "desc" }
          : sortField === "price"
            ? { price: sortOrder as "asc" | "desc" }
            : sortField === "sku_code"
              ? { sku_code: sortOrder as "asc" | "desc" }
              : { status: sortOrder as "asc" | "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        price: true,
        is_active: true,
        status: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((sku) => ({
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    })),
  };
}
