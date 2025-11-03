import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventory";
import { IPageIShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerInventory(props: {
  seller: SellerPayload;
  body: IShoppingInventory.IRequest;
}): Promise<IPageIShoppingInventory.ISummary> {
  const { seller, body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  // Build quantity filter separately to avoid self-reference
  let quantity: Record<string, number> | undefined;
  if (body.min_quantity !== undefined && body.max_quantity !== undefined) {
    quantity = { gte: body.min_quantity, lte: body.max_quantity };
  } else if (body.min_quantity !== undefined) {
    quantity = { gte: body.min_quantity };
  } else if (body.max_quantity !== undefined) {
    quantity = { lte: body.max_quantity };
  }

  // Build where condition for Prisma
  const where: Record<string, any> = {
    deleted_at: null,
    ...(quantity && { quantity }),
    sku: {
      ...(body.sku_code !== undefined && { sku_code: body.sku_code }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      product: {
        shopping_seller_id: seller.id,
        ...(body.product_code !== undefined && { code: body.product_code }),
      },
    },
  };

  // Keyword search
  if (body.keyword) {
    (where.sku as any).OR = [
      { sku_code: { contains: body.keyword } },
      { product: { name: { contains: body.keyword } } },
    ];
  }

  // Sort
  let orderBy: any = { updated_at: "desc" };
  if (body.sort_by === "sku_code") {
    orderBy = { sku: { sku_code: body.sort_order === "asc" ? "asc" : "desc" } };
  } else if (body.sort_by === "quantity") {
    orderBy = { quantity: body.sort_order === "asc" ? "asc" : "desc" };
  } else if (body.sort_by === "updated_at") {
    orderBy = { updated_at: body.sort_order === "asc" ? "asc" : "desc" };
  }

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_inventory.count({ where }),
    MyGlobal.prisma.shopping_inventory.findMany({
      where,
      include: { sku: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_sku_id: row.shopping_sku_id,
    quantity: row.quantity,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
