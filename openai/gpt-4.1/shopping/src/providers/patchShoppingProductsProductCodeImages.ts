import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { IPageIShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingProductsProductCodeImages(props: {
  productCode: string;
  body: IShoppingProductImage.IRequest;
}): Promise<IPageIShoppingProductImage> {
  const { productCode, body } = props;
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: productCode,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not accessible", 404);
  }

  const page =
    body.page !== undefined &&
    body.page !== null &&
    typeof body.page === "number" &&
    body.page > 0
      ? Number(body.page)
      : 1;
  let limit =
    body.limit !== undefined &&
    body.limit !== null &&
    typeof body.limit === "number" &&
    body.limit > 0
      ? Number(body.limit)
      : 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const imageSearch = body.search ? body.search : undefined;

  const allowedOrderFields = ["created_at", "order_index"] as const;
  const orderByField =
    typeof body.order_by === "string" &&
    allowedOrderFields.includes(
      body.order_by as (typeof allowedOrderFields)[number],
    )
      ? (body.order_by as (typeof allowedOrderFields)[number])
      : "created_at";
  const dir =
    body.order_direction === "asc" || body.order_direction === "desc"
      ? body.order_direction
      : "desc";

  const where = {
    shopping_product_id: product.id,
    ...(imageSearch && { image_uri: { contains: imageSearch } }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_product_images.findMany({
      where,
      orderBy: { [orderByField]: dir },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_product_id: true,
        image_uri: true,
        order_index: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_product_images.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_product_id: row.shopping_product_id,
    image_uri: row.image_uri,
    order_index:
      row.order_index !== null && row.order_index !== undefined
        ? row.order_index
        : undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
