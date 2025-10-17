import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IImageUpdate;
}): Promise<IShoppingMallProductImage> {
  const { seller, productId, imageId, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or you do not have permission to modify it",
      404,
    );
  }

  const existingImage =
    await MyGlobal.prisma.shopping_mall_product_images.findFirst({
      where: {
        id: imageId,
        shopping_mall_product_id: productId,
      },
    });

  if (!existingImage) {
    throw new HttpException(
      "Image not found or does not belong to the specified product",
      404,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: {
      id: imageId,
    },
    data: {
      display_order: body.display_order ?? undefined,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_sku_id: updated.shopping_mall_sku_id ?? undefined,
    image_url: updated.image_url,
    display_order: updated.display_order,
    is_primary: updated.is_primary,
    alt_text: updated.alt_text ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
