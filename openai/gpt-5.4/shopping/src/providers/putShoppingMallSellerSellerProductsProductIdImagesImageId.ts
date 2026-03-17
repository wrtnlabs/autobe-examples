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

export async function putShoppingMallSellerSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: {
      id: true,
      suspended: true,
    },
  });
  if (seller.suspended === true) {
    throw new HttpException(
      "Suspended sellers cannot change product images",
      403,
    );
  }
  if (
    props.body.imageUri === undefined &&
    props.body.sequence === undefined &&
    props.body.isThumbnail === undefined
  ) {
    throw new HttpException("Invalid update payload", 400);
  }
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
        sequence: true,
      },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Image does not belong to the specified product",
      400,
    );
  }
  if (image.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const activeImages = await prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sequence: true,
      },
      orderBy: {
        sequence: "asc",
      },
    });
    const others = activeImages.filter((entry) => entry.id !== props.imageId);
    const requestedSequence = props.body.sequence ?? image.sequence;
    const boundedSequence = Math.min(
      Math.max(requestedSequence, 1),
      activeImages.length,
    );
    const reordered = [
      ...others.slice(0, boundedSequence - 1),
      { id: props.imageId },
      ...others.slice(boundedSequence - 1),
    ].map((entry, index) => ({
      id: entry.id,
      sequence: index + 1,
      is_thumbnail: index === 0,
    }));
    const now = new Date().toISOString();
    for (const entry of activeImages) {
      await prisma.shopping_mall_product_images.update({
        where: { id: entry.id },
        data: {
          sequence: entry.sequence + activeImages.length + 1000,
          updated_at: now,
        },
      });
    }
    for (const entry of reordered) {
      await prisma.shopping_mall_product_images.update({
        where: { id: entry.id },
        data: {
          ...(entry.id === props.imageId && props.body.imageUri !== undefined
            ? { image_uri: props.body.imageUri }
            : {}),
          sequence: entry.sequence,
          is_thumbnail: entry.is_thumbnail,
          updated_at: now,
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(updated);
}
