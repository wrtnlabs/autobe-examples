import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function getShoppingMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    include: {
      category: true,
      seller: true,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    price: product.price,
    compare_price: product.compare_price ?? undefined,
    cost_price: product.cost_price ?? undefined,
    stock_quantity: product.stock_quantity,
    status: product.status,
    condition: product.condition,
    weight: product.weight ?? undefined,
    dimensions: product.dimensions ?? undefined,
    category: {
      id: product.category.id,
      name: product.category.name,
      description: product.category.description ?? undefined,
      display_order: product.category.display_order,
      active: product.category.active,
      parent_id:
        product.category.parent_id !== null
          ? (product.category.parent_id satisfies string &
              tags.Format<"uuid"> as string & tags.Format<"uuid">)
          : ("" satisfies string & tags.Format<"uuid"> as string &
              tags.Format<"uuid">),
      created_at: toISOStringSafe(product.category.created_at),
      updated_at: toISOStringSafe(product.category.updated_at),
      parent: undefined,
    },
    seller: {
      id: product.seller.id,
      business_name: product.seller.business_name,
      contact_person: product.seller.contact_person,
      email: product.seller.email,
      status: product.seller.status,
    },
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
  };
}
