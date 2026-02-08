import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or has been deleted", 404);
  }
  // Cast props.body to any to access missing properties
  const bodyAny = props.body as any;
  const createInput = await ShoppingMallProductImageCollector.collect({
    body: props.body,
    image_url: bodyAny.image_url,
    display_order: bodyAny.display_order,
    shopping_mall_product_id: props.productId as string,
  });
  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: createInput,
  });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    image_url: created.image_url,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
