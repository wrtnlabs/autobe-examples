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

export async function putShoppingMallSellerProductsProductIdImagesOrder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IReorder;
}): Promise<IShoppingMallProductImage> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const imageIds = (props.body as any).ids || (props.body as any).imageIds;
  if (!imageIds || imageIds.length === 0) {
    throw new HttpException("Image IDs array cannot be empty", 400);
  }
  const uniqueImageIds = new Set(imageIds);
  if (uniqueImageIds.size !== imageIds.length) {
    throw new HttpException("Duplicate image IDs not allowed", 400);
  }
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        id: { in: imageIds },
        shopping_mall_product_id: props.productId,
      },
    });
  if (existingImages.length !== imageIds.length) {
    throw new HttpException(
      "All image IDs must belong to the specified product",
      400,
    );
  }
  for (let i = 0; i < imageIds.length; i++) {
    await MyGlobal.prisma.shopping_mall_product_images.update({
      where: { id: imageIds[i] },
      data: {
        display_order: i,
      },
    });
  }
  const updatedImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
      orderBy: {
        display_order: "asc",
      },
    });
  return {
    id: updatedImages[0].id,
    shopping_mall_product_id: updatedImages[0].shopping_mall_product_id,
    display_order: updatedImages[0].display_order,
    image_url: updatedImages[0].image_url,
  } as IShoppingMallProductImage;
}
