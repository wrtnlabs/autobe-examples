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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminInventory(props: {
  admin: AdminPayload;
  body: IShoppingInventory.IRequest;
}): Promise<IPageIShoppingInventory.ISummary> {
  const {
    page,
    limit,
    sku_code,
    product_code,
    seller_id,
    min_quantity,
    max_quantity,
    keyword,
    sort_by,
    sort_order,
    is_active,
  } = props.body;

  const allowedSortFields = ["sku_code", "quantity", "updated_at"];
  const allowedSortOrders = ["asc", "desc"];
  const sortField = sort_by ?? "updated_at";
  const sortOrder = sort_order ?? "desc";

  if (!allowedSortFields.includes(sortField)) {
    throw new HttpException("Invalid sort_by field", 400);
  }
  if (!allowedSortOrders.includes(sortOrder)) {
    throw new HttpException("Invalid sort_order value", 400);
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Compose filters for nested relations
  const skuWhere: Record<string, any> = {};
  if (sku_code !== undefined) {
    skuWhere.sku_code = sku_code;
  }
  if (is_active !== undefined) {
    skuWhere.is_active = is_active;
  }
  let productWhere: Record<string, any> | undefined = undefined;
  if (product_code !== undefined || seller_id !== undefined) {
    productWhere = {};
    if (product_code !== undefined) {
      productWhere.code = product_code;
    }
    if (seller_id !== undefined) {
      productWhere.shopping_seller_id = seller_id;
    }
  }
  let keywordOr: any[] | undefined = undefined;
  if (keyword !== undefined && keyword.trim().length > 0) {
    keywordOr = [
      { sku_code: { contains: keyword } },
      { product: { name: { contains: keyword } } },
      {
        product: {
          shopping_product_tag_assignments: {
            some: { tag: { display_value: { contains: keyword } } },
          },
        },
      },
    ];
  }

  // Compose inventoryWhere for shopping_inventory
  const inventoryWhere: Record<string, any> = {
    deleted_at: null,
  };

  if (min_quantity !== undefined && max_quantity !== undefined) {
    inventoryWhere.quantity = {
      gte: min_quantity,
      lte: max_quantity,
    };
  } else if (min_quantity !== undefined) {
    inventoryWhere.quantity = { gte: min_quantity };
  } else if (max_quantity !== undefined) {
    inventoryWhere.quantity = { lte: max_quantity };
  }

  if (
    Object.keys(skuWhere).length > 0 ||
    productWhere !== undefined ||
    (keywordOr !== undefined && keywordOr.length > 0)
  ) {
    inventoryWhere.sku = {
      ...(Object.keys(skuWhere).length > 0 ? skuWhere : {}),
      ...(productWhere !== undefined ? { product: productWhere } : {}),
      ...(keywordOr && keywordOr.length > 0 ? { OR: keywordOr } : {}),
    };
  }

  let orderBy: any;
  if (sortField === "sku_code") {
    orderBy = { sku: { sku_code: sortOrder } };
  } else if (sortField === "quantity") {
    orderBy = { quantity: sortOrder };
  } else {
    orderBy = { updated_at: sortOrder };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_inventory.findMany({
      where: inventoryWhere,
      include: {
        sku: {
          select: {
            sku_code: true,
            is_active: true,
            product: {
              select: {
                code: true,
                shopping_seller_id: true,
                name: true,
                shopping_product_tag_assignments: {
                  select: {
                    tag: {
                      select: {
                        display_value: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limitNum,
    }),
    MyGlobal.prisma.shopping_inventory.count({
      where: inventoryWhere,
    }),
  ]);

  const data = records.map((record) => {
    return {
      id: record.id,
      shopping_sku_id: record.shopping_sku_id,
      quantity: record.quantity,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at !== null && record.deleted_at !== undefined
          ? toISOStringSafe(record.deleted_at)
          : null,
    };
  });

  return {
    pagination: {
      current: pageNum,
      limit: limitNum,
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data,
  };
}
