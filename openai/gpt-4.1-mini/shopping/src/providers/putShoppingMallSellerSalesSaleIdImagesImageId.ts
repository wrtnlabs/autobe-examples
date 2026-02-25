import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleImageTransformer } from "../transformers/ShoppingMallSaleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSalesSaleIdImagesImageId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleImage.IUpdate;
}): Promise<IShoppingMallSaleImage> {
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Validate sale ownership
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate image belongs to sale
  const image =
    await MyGlobal.prisma.shopping_mall_sale_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        shopping_mall_sale_id: true,
        display_order: true,
        deleted_at: true,
      },
    });
  if (image.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Forbidden", 403);
  }
  if (image.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Validate displayOrder
  if (
    !Number.isInteger(props.body.displayOrder) ||
    props.body.displayOrder <= 0
  ) {
    throw new HttpException("displayOrder must be a positive integer", 400);
  }
  // Validate imageUrl
  if (
    typeof props.body.imageUrl !== "string" ||
    props.body.imageUrl.trim() === ""
  ) {
    throw new HttpException("imageUrl must be a non-empty string", 400);
  }
  // Check for display order conflict
  if (props.body.displayOrder !== image.display_order) {
    const conflict = await MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: {
        shopping_mall_sale_id: props.saleId,
        display_order: props.body.displayOrder,
        NOT: { id: props.imageId },
        deleted_at: null,
      },
    });
    if (conflict) {
      // Adjust display orders of following images
      const imagesToAdjust =
        await MyGlobal.prisma.shopping_mall_sale_images.findMany({
          where: {
            shopping_mall_sale_id: props.saleId,
            display_order: {
              gte: props.body.displayOrder,
            },
            NOT: { id: props.imageId },
            deleted_at: null,
          },
          orderBy: { display_order: "asc" },
        });
      for (const img of imagesToAdjust) {
        await MyGlobal.prisma.shopping_mall_sale_images.update({
          where: { id: img.id },
          data: { display_order: img.display_order + 1, updated_at: now },
        });
      }
    }
  }
  // Update the image
  await MyGlobal.prisma.shopping_mall_sale_images.update({
    where: { id: props.imageId },
    data: {
      image_url: props.body.imageUrl,
      display_order: props.body.displayOrder,
      alt_text: props.body.altText ?? null,
      updated_at: now,
    },
  });
  // Return updated image
  const updated =
    await MyGlobal.prisma.shopping_mall_sale_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ShoppingMallSaleImageTransformer.select(),
    });
  return await ShoppingMallSaleImageTransformer.transform(updated);
}
