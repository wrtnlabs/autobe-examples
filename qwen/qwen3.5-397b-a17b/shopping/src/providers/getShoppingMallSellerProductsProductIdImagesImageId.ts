import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            base_price: true,
            variants: {
              select: {
                price_override: true,
              },
            },
          },
        },
      },
    });
  return {
    id: image.id,
    image_url: image.image_url,
    display_order: image.display_order,
    product: {
      min: (() => {
        const basePrice = Number(image.product.base_price);
        const variantPrices = image.product.variants.map((v) =>
          v.price_override ? Number(v.price_override) : basePrice,
        );
        const prices = variantPrices.length > 0 ? variantPrices : [basePrice];
        return Math.min(...prices);
      })(),
      max: (() => {
        const basePrice = Number(image.product.base_price);
        const variantPrices = image.product.variants.map((v) =>
          v.price_override ? Number(v.price_override) : basePrice,
        );
        const prices = variantPrices.length > 0 ? variantPrices : [basePrice];
        return Math.max(...prices);
      })(),
    } satisfies IShoppingMallProduct.ISummary,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at: image.deleted_at ? toISOStringSafe(image.deleted_at) : null,
  };
}
