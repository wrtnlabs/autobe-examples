import { IArrayIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIShoppingMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IArrayIShoppingMallProductImage> {
  // Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Get maximum display order for this product
  const maxOrderRecord =
    await MyGlobal.prisma.shopping_mall_product_images.aggregate({
      _max: {
        display_order: true,
      },
      where: {
        shopping_mall_product_id: props.productId,
      },
    });
  const maxDisplayOrder = maxOrderRecord._max.display_order ?? 0;
  // Create the product image record
  const createdImage =
    await MyGlobal.prisma.shopping_mall_product_images.create({
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        display_order: maxDisplayOrder + 1,
        image_url: "",
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        display_order: true,
        image_url: true,
      },
    });
  return [createdImage] as IArrayIShoppingMallProductImage;
}
