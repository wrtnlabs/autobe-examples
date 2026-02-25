import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpload;
}): Promise<IShoppingMallProductImage> {
  // Validate product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  // Count existing images to enforce limit
  const existingCount =
    await MyGlobal.prisma.shopping_mall_product_images.count({
      where: { product_id: props.productId, deleted_at: null },
    });
  if (existingCount >= 10) {
    throw new HttpException("Maximum 10 images per product", 400);
  }
  // Calculate next position
  const maxPosition =
    await MyGlobal.prisma.shopping_mall_product_images.aggregate({
      _max: { position: true },
      where: { product_id: props.productId, deleted_at: null },
    });
  const position =
    maxPosition._max.position !== null ? maxPosition._max.position + 1 : 0;
  // Validate image_url is valid URI using typia
  const validatedImageUrl = typia.assert<string & tags.Format<"uri">>(
    props.body.image_url,
  );
  // Create image record
  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: {
      id: v4(),
      product_id: props.productId,
      image_url: validatedImageUrl,
      position,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      deleted_at: null,
    },
    ...ShoppingMallProductImageTransformer.select(),
  });
  return await ShoppingMallProductImageTransformer.transform(created);
}
