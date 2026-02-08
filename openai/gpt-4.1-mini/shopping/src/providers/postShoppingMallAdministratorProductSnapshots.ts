import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductSnapshotCollector } from "../collectors/ShoppingMallProductSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorProductSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductSnapshot.ICreate;
}): Promise<IShoppingMallProductSnapshot> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: (props.body as any).shoppingMallProductId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  const createInput = await ShoppingMallProductSnapshotCollector.collect({
    body: props.body,
    product,
    name: product.name,
    description: product.description,
    categoryId: product.product_subcategory_id,
    basePrice: product.base_price,
  });
  const created = await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: createInput,
  });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    name: created.name,
    description: created.description,
    category_id: created.category_id,
    base_price: created.base_price,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
