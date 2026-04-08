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
  productId: string;
  productImageId: string;
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage> {
  // Load image with product to verify ownership
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
    where: {
      id: props.productImageId,
      deleted_at: null,
    },
    select: {
      id: true,
      display_order: true,
      product: {
        select: {
          id: true,
          seller_id: true,
        },
      },
    },
  } satisfies Prisma.ecommerce_mall_product_imagesFindFirstArgs);
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  // Verify product_id matches path parameter
  if (image.product.id !== props.productId) {
    throw new HttpException("Image does not belong to specified product", 404);
  }
  // Verify seller owns the product
  if (image.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const newDisplayOrder = props.body.display_order;
  // If display_order is provided and different, handle reordering
  if (
    newDisplayOrder !== undefined &&
    newDisplayOrder !== image.display_order
  ) {
    const oldOrder = image.display_order;
    const newOrder = newDisplayOrder;
    await MyGlobal.prisma.$transaction(async (tx) => {
      if (newOrder < oldOrder) {
        // Moving to lower position (earlier): increment others in [new, old)
        await tx.ecommerce_mall_product_images.updateMany({
          where: {
            product_id: props.productId,
            display_order: {
              gte: newOrder,
              lt: oldOrder,
            },
            deleted_at: null,
          },
          data: {
            display_order: {
              increment: 1,
            },
          },
        });
      } else {
        // Moving to higher position (later): decrement others in (old, new]
        await tx.ecommerce_mall_product_images.updateMany({
          where: {
            product_id: props.productId,
            display_order: {
              gt: oldOrder,
              lte: newOrder,
            },
            deleted_at: null,
          },
          data: {
            display_order: {
              decrement: 1,
            },
          },
        });
      }
      // Update the target image
      await tx.ecommerce_mall_product_images.update({
        where: {
          id: props.productImageId,
        },
        data: {
          display_order: newOrder,
          updated_at: new Date(),
        },
      });
    });
  } else if (newDisplayOrder !== undefined) {
    // Same position, just update timestamp
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: {
        id: props.productImageId,
      },
      data: {
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return updated image
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: {
        id: props.productImageId,
      },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(updated);
}
