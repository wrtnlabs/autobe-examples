import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string;
}): Promise<IPageIShoppingMallProductSnapshot.IS> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Fetch snapshots with product details in single query to get missing fields
  const data = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where: { product_id: props.productId },
    orderBy: { version: "desc" },
    skip,
    take: limit,
    select: {
      version: true,
      changed_at: true,
      changed_by_id: true,
      category_id: true,
      product_id: true,
      product: {
        select: {
          name: true,
          description: true,
          base_price: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: { product_id: props.productId },
  });
  return {
    data: data.map((snapshot) => ({
      version: snapshot.version,
      changed_at: toISOStringSafe(snapshot.changed_at),
      changed_by_id: snapshot.changed_by_id,
      category_id: snapshot.category_id,
      product_id: snapshot.product_id,
      name: snapshot.product.name,
      description: snapshot.product.description,
      base_price: snapshot.product.base_price,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
