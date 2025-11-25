import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallAdminProductsProductIdSkus(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  // Validate product exists and is not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Filtering
  const body = props.body;
  const whereCondition = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.sku_code !== undefined &&
      body.sku_code.trim() !== "" && {
        sku_code: {
          contains: body.sku_code,
          mode: "insensitive" as Prisma.QueryMode,
        },
      }),
    ...(body.min_price !== undefined && { price: { gte: body.min_price } }),
    ...(body.max_price !== undefined && {
      price: {
        ...(body.min_price !== undefined ? { gte: body.min_price } : {}),
        lte: body.max_price,
      },
    }),
    ...(body.min_stock !== undefined && { stock: { gte: body.min_stock } }),
    ...(body.max_stock !== undefined && {
      stock: {
        ...(body.min_stock !== undefined ? { gte: body.min_stock } : {}),
        lte: body.max_stock,
      },
    }),
  };

  // Pagination
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort_by) {
    orderBy = { [body.sort_by]: body.order === "asc" ? "asc" : "desc" };
  }

  const [total, skus] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.count({ where: whereCondition }),
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
  ]);

  // Prepare summary data for API
  const data = skus.map((sku) => ({
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: "", // Option summary not available in SKU model, placeholder empty string
    in_stock: sku.stock > 0 && sku.status === "active",
  }));

  const response = {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };

  return response;
}
