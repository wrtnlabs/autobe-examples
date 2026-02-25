import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
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

export async function patchShoppingMallSellerSalesSaleIdImages(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleImage.IUpdate[];
}): Promise<IPageIShoppingMallSaleImage.ISummary> {
  const { seller, saleId, body } = props;
  // Verify sale exists and belongs to seller
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: saleId },
    select: { id: true, seller_id: true },
  });
  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }
  if (sale.seller_id !== seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate input
  if (!Array.isArray(body)) {
    throw new HttpException("Request body must be an array", 400);
  }
  // Validate each image update entry
  body.forEach((image) => {
    try {
      new URL(image.imageUrl);
    } catch {
      throw new HttpException("Invalid imageUrl format", 400);
    }
    if (!Number.isInteger(image.displayOrder) || image.displayOrder <= 0) {
      throw new HttpException("displayOrder must be a positive integer", 400);
    }
  });
  // Transactionally update
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch existing images for sale
    const existingImages = await tx.shopping_mall_sale_images.findMany({
      where: { shopping_mall_sale_id: saleId, deleted_at: null },
      select: { id: true, display_order: true },
    });
    // Validate no duplicate displayOrder values
    const displayOrderSet = new Set<number>();
    body.forEach((img) => {
      if (displayOrderSet.has(img.displayOrder)) {
        throw new HttpException(
          "Duplicate displayOrder values are not allowed",
          400,
        );
      }
      displayOrderSet.add(img.displayOrder);
    });
    // Delete all existing images
    await tx.shopping_mall_sale_images.deleteMany({
      where: { shopping_mall_sale_id: saleId },
    });
    // Insert updated images
    for (const imgUpdate of body) {
      await tx.shopping_mall_sale_images.create({
        data: {
          id: v4(),
          shopping_mall_sale_id: saleId,
          image_url: imgUpdate.imageUrl,
          display_order: imgUpdate.displayOrder,
          alt_text: imgUpdate.altText ?? null,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      });
    }
    // Fetch updated images ordered by displayOrder
    const images = await tx.shopping_mall_sale_images.findMany({
      where: { shopping_mall_sale_id: saleId, deleted_at: null },
      orderBy: { display_order: "asc" },
    });
    // Build response
    return {
      pagination: {
        current: 1,
        limit: images.length,
        records: images.length,
        pages: 1,
      },
      data: images.map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        displayOrder: img.display_order,
        altText: img.alt_text ?? undefined,
        createdAt: toISOStringSafe(img.created_at),
        updatedAt: toISOStringSafe(img.updated_at),
        deletedAt: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
      })),
    };
  });
}
