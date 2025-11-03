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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminProductsProductCodeSkus(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingSku.IRequest;
}): Promise<IPageIShoppingSku.ISummary> {
  // Step 1: Find the product by code, not soft-deleted
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Prepare pagination params
  const page = props.body.page ?? 1;
  let limit = props.body.limit ?? 20;
  if (limit > 100) limit = 100;
  // Step 3: Build 'where' condition
  const where = {
    shopping_product_id: product.id,
    deleted_at: null,
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.barcode !== undefined && {
      barcode: { contains: props.body.barcode },
    }),
    ...(props.body.min_price !== undefined && props.body.max_price !== undefined
      ? {
          price: {
            gte: props.body.min_price,
            lte: props.body.max_price,
          },
        }
      : props.body.min_price !== undefined
        ? { price: { gte: props.body.min_price } }
        : props.body.max_price !== undefined
          ? { price: { lte: props.body.max_price } }
          : {}),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        OR: [
          { sku_code: { contains: props.body.search } },
          { barcode: { contains: props.body.search } },
        ],
      }),
  };
  // Step 4: Build 'orderBy' option
  const ALLOWED_SORT_FIELDS = ["created_at", "price", "sku_code", "status"];
  let sort_by: "created_at" | "price" | "sku_code" | "status" = "created_at";
  if (
    typeof props.body.sort_by === "string" &&
    ALLOWED_SORT_FIELDS.includes(props.body.sort_by)
  ) {
    sort_by = props.body.sort_by as typeof sort_by;
  }
  let sort_order: "asc" | "desc" = "desc";
  if (props.body.sort_order === "asc" || props.body.sort_order === "desc") {
    sort_order = props.body.sort_order;
  }
  // Step 5: Query paginated SKUs and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_skus.findMany({
      where: where,
      orderBy: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        price: true,
        is_active: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_skus.count({ where }),
  ]);
  // Step 6: Map records to ISummary
  const data = records.map((sku) => ({
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    is_active: sku.is_active,
    status: sku.status,
  }));
  // Step 7: Create pagination info
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(Number(total) / Number(limit)),
  };
  return {
    pagination: pagination,
    data: data,
  };
}
