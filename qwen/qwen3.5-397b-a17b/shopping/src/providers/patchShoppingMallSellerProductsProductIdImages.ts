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
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingImage =
    await MyGlobal.prisma.shopping_mall_product_images.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  if (!existingImage) {
    throw new HttpException("No images found for this product", 404);
  }
  const updateData: Prisma.shopping_mall_product_imagesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  if (props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }
  if (props.body.deleted_at !== undefined) {
    updateData.deleted_at = props.body.deleted_at === null ? null : new Date();
  }
  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: existingImage.id },
    data: updateData,
    ...ShoppingMallProductImageTransformer.select(),
  });
  return await ShoppingMallProductImageTransformer.transform(updated);
}
