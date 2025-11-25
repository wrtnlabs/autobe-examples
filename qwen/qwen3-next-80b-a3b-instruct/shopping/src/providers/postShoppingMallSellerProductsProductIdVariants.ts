import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Validate parent product exists and is published
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      status: "published",
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Parent product not found or not published", 404);
  }

  // Convert string body to structured object properties
  const bodyObject = JSON.parse(props.body as string);

  // Create new variant with system-generated fields
  const variant = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      sku: bodyObject.sku,
      title: bodyObject.title,
      price: bodyObject.price,
      inventory_count: bodyObject.inventory_count,
      attributes: bodyObject.attributes,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: variant.id,
    title: variant.title,
    price: variant.price,
    sku: variant.sku,
    inventory_count: variant.inventory_count,
    attributes: variant.attributes,
    created_at: toISOStringSafe(variant.created_at),
    updated_at: toISOStringSafe(variant.updated_at),
    deleted_at: variant.deleted_at ? toISOStringSafe(variant.deleted_at) : null,
  };
}
