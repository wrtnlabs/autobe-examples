import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdImagesProductImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productImageId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage> {
  // Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify image exists and belongs to product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.productImageId },
      select: { id: true, product_id: true, display_order: true },
    });
  if (image.product_id !== props.productId) {
    throw new HttpException("Image not found for this product", 404);
  }
  // If display_order is provided, handle reordering
  if (props.body.display_order !== undefined) {
    const newOrder = props.body.display_order;
    const currentOrder = image.display_order;
    // Get max display order for this product
    const maxOrderResult =
      await MyGlobal.prisma.ecommerce_mall_product_images.aggregate({
        where: {
          product_id: props.productId,
          deleted_at: null,
        },
        _max: { display_order: true },
      });
    const maxOrder = maxOrderResult._max.display_order ?? 0;
    // Validate range
    if (newOrder < 0 || newOrder > maxOrder) {
      throw new HttpException("Invalid display order", 400);
    }
    // No change needed if same position
    if (newOrder !== currentOrder) {
      await MyGlobal.prisma.$transaction(async (tx) => {
        if (newOrder < currentOrder) {
          // Moving earlier: increment display_order of images in range [newOrder, currentOrder)
          await tx.ecommerce_mall_product_images.updateMany({
            where: {
              product_id: props.productId,
              display_order: {
                gte: newOrder,
                lt: currentOrder,
              },
              deleted_at: null,
            },
            data: {
              display_order: { increment: 1 },
              updated_at: new Date(),
            },
          });
        } else {
          // Moving later: decrement display_order of images in range (currentOrder, newOrder]
          await tx.ecommerce_mall_product_images.updateMany({
            where: {
              product_id: props.productId,
              display_order: {
                gt: currentOrder,
                lte: newOrder,
              },
              deleted_at: null,
            },
            data: {
              display_order: { decrement: 1 },
              updated_at: new Date(),
            },
          });
        }
        // Update the target image
        await tx.ecommerce_mall_product_images.update({
          where: { id: props.productImageId },
          data: {
            display_order: newOrder,
            updated_at: new Date(),
          },
        });
      });
    } else {
      // Same position, just update timestamp
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: props.productImageId },
        data: {
          updated_at: new Date(),
        },
      });
    }
  } else {
    // No display_order change, just update timestamp
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: props.productImageId },
      data: {
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return updated image
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.productImageId },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(updated);
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
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductIdImagesProductImageId(props: {
//   seller: SellerPayload;
//   productId: string;
//   productImageId: string;
//   body: IEcommerceMallProductImage.IUpdate;
// }): Promise<IEcommerceMallProductImage> {
//   await MyGlobal.prisma.ecommerce_mall_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallProductImageTransformer.select(),
//   });
//   return await EcommerceMallProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------