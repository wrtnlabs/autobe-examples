import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const sellerRecord =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { suspended_at: true },
    });
  if (sellerRecord.suspended_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        image_url: true,
        display_order: true,
      },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const hasImageUrlChange: boolean =
    props.body.image_url !== undefined &&
    props.body.image_url !== image.image_url;
  const hasDisplayOrderChange: boolean =
    props.body.display_order !== undefined &&
    props.body.display_order !== image.display_order;
  if (!hasImageUrlChange && !hasDisplayOrderChange) {
    const current =
      await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
        where: { id: props.imageId },
        ...ShoppingMallProductImageTransformer.select(),
      });
    return await ShoppingMallProductImageTransformer.transform(current);
  }
  const allImages = await MyGlobal.prisma.shopping_mall_product_images.findMany(
    {
      where: { shopping_mall_product_id: props.productId },
      select: { id: true, image_url: true, display_order: true },
      orderBy: { display_order: "asc" },
    },
  );
  const totalImageCount: number = allImages.length;
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshotId: string & tags.Format<"uuid"> = v4();
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        shopping_mall_product_id: props.productId,
        shopping_mall_category_id: product.shopping_mall_category_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        created_at: now,
      },
    });
    for (const img of allImages) {
      await tx.shopping_mall_product_snapshot_images.create({
        data: {
          id: v4(),
          shopping_mall_product_snapshot_id: snapshotId,
          shopping_mall_product_image_id: img.id,
          image_url: img.image_url,
          display_order: img.display_order,
          created_at: now,
        },
      });
    }
    if (hasImageUrlChange && props.body.image_url !== undefined) {
      await tx.shopping_mall_product_images.update({
        where: { id: props.imageId },
        data: {
          image_url: props.body.image_url,
          updated_at: now,
        },
      });
    }
    if (hasDisplayOrderChange && props.body.display_order !== undefined) {
      const oldDisplayOrder: number = image.display_order;
      const newDisplayOrder: number = Math.min(
        Math.max(props.body.display_order, 0),
        totalImageCount - 1,
      );
      if (newDisplayOrder < oldDisplayOrder) {
        await tx.shopping_mall_product_images.updateMany({
          where: {
            shopping_mall_product_id: props.productId,
            id: { not: props.imageId },
            display_order: { gte: newDisplayOrder, lt: oldDisplayOrder },
          },
          data: {
            display_order: { increment: 1 },
            updated_at: now,
          },
        });
      } else if (newDisplayOrder > oldDisplayOrder) {
        await tx.shopping_mall_product_images.updateMany({
          where: {
            shopping_mall_product_id: props.productId,
            id: { not: props.imageId },
            display_order: { gt: oldDisplayOrder, lte: newDisplayOrder },
          },
          data: {
            display_order: { decrement: 1 },
            updated_at: now,
          },
        });
      }
      await tx.shopping_mall_product_images.update({
        where: { id: props.imageId },
        data: {
          display_order: newDisplayOrder,
          updated_at: now,
        },
      });
      const reorderedImages = await tx.shopping_mall_product_images.findMany({
        where: { shopping_mall_product_id: props.productId },
        select: { id: true, display_order: true },
        orderBy: { display_order: "asc" },
      });
      for (let i = 0; i < reorderedImages.length; i++) {
        if (reorderedImages[i].display_order !== i) {
          await tx.shopping_mall_product_images.update({
            where: { id: reorderedImages[i].id },
            data: {
              display_order: i,
              updated_at: now,
            },
          });
        }
      }
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductImage.IUpdate;
// }): Promise<IShoppingMallProductImage> {
//   await MyGlobal.prisma.shopping_mall_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallProductImageTransformer.select(),
//   });
//   return await ShoppingMallProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------