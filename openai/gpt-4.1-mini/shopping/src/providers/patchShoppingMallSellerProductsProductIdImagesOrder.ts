import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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

export async function patchShoppingMallSellerProductsProductIdImagesOrder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdateOrder;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  const { seller, productId, body } = props;
  // Cast items to correct type to ensure 'id' and 'displayOrder' exist
  type OrderItem = {
    id: string;
    displayOrder: number;
  };
  const items = body.items as unknown as OrderItem[];
  const imageIds = items.map((item) => item.id);
  if (imageIds.length === 0) {
    throw new HttpException("No images provided for reorder", 400);
  }
  const displayOrders = items.map((item) => item.displayOrder);
  const uniqueDisplayOrders = new Set(displayOrders);
  if (uniqueDisplayOrders.size !== displayOrders.length) {
    throw new HttpException("Display order values must be unique", 400);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: productId },
    });
  if (
    (
      product as {
        seller_id: string;
      }
    ).seller_id !== seller.id
  ) {
    throw new HttpException("Unauthorized", 403);
  }
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        id: { in: imageIds },
        shopping_mall_product_id: productId,
        deleted_at: null,
      },
    });
  if (existingImages.length !== imageIds.length) {
    throw new HttpException(
      "Some images do not exist in the specified product",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    for (const item of items) {
      await tx.shopping_mall_product_images.update({
        where: { id: item.id },
        data: {
          display_order: item.displayOrder,
          updated_at: now,
        },
      });
    }
  });
  const updatedImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  const count = updatedImages.length;
  return {
    pagination: {
      current: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: count as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: count as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages:
        count > 0
          ? (1 as number & tags.Type<"int32"> & tags.Minimum<0>)
          : (0 as number & tags.Type<"int32"> & tags.Minimum<0>),
    },
    data: updatedImages.map((img) => {
      const createdAt = toISOStringSafe(img.created_at);
      const updatedAt = toISOStringSafe(img.updated_at);
      const deletedAt = img.deleted_at ? toISOStringSafe(img.deleted_at) : null;
      return {
        id: img.id,
        imageUrl: img.image_url,
        displayOrder: img.display_order,
        createdAt,
        updatedAt,
        deletedAt,
      };
    }),
  };
}
