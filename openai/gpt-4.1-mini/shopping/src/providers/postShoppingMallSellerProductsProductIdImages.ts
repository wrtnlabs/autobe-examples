import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // Verify that the seller owns the specified product
  const sellerOwns = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: {
        id: props.seller.id,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerOwns) {
    throw new HttpException("Forbidden", 403);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Shift display_order for existing images to maintain order
    await tx.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        display_order: { gte: props.body.display_order },
        deleted_at: null,
      },
      data: { display_order: { increment: 1 } },
    });
    // Collect data for creating new image record
    const collected = await ShoppingMallProductImageCollector.collect({
      body: props.body,
      shoppingMallProducts: { id: props.productId },
    });
    // Get current time as ISO string with correct type
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    const createInput = {
      ...collected,
      id: v4() as string & tags.Format<"uuid">,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
    // Create new image record within transaction
    const created = await tx.shopping_mall_product_images.create({
      data: createInput,
      ...ShoppingMallProductImageTransformer.select(),
    });
    // Transform created record to response DTO
    return await ShoppingMallProductImageTransformer.transform(created);
  });
}
