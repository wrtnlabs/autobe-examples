import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsManage(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallProduct> {
  const skip = 0;
  const limit = 10;
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      name: true,
      seller_id: true,
      category_id: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      seller: {
        select: {
          id: true,
        },
      },
    },
  });
  // Count total products
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      // No where conditions - select all products (active ones only, since deleted are permanently removed)
    },
  });
  // Transform products to match IShoppingMallProduct interface
  // Note: Although IShoppingMallProduct is empty, the type requires the exact fields from the schema
  const transformedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    seller_id: product.seller_id,
    category_id: product.category_id,
    is_deleted: product.deleted_at !== null,
    created_at: toISOStringSafe(product.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(product.updated_at) as string &
      tags.Format<"date-time">,
    seller_name: product.seller?.id,
  }));
  return {
    data: transformedProducts,
    pagination: {
      current: Math.floor(skip / limit) + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
