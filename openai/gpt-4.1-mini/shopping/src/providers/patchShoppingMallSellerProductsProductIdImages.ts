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

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdateMany;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  // Validate product ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Retrieve current images
  const currentImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  // Validate input image ids and display orders
  const currentImageIds = new Set(currentImages.map((img) => img.id));
  const displayOrderSet = new Set<number>();
  // Convert props.body to array for iteration
  const updates = Array.isArray(props.body)
    ? props.body
    : Object.values(props.body);
  for (const update of updates) {
    if (!currentImageIds.has(update.id)) {
      throw new HttpException(
        `Image id ${update.id} does not belong to product`,
        400,
      );
    }
    if (displayOrderSet.has(update.display_order)) {
      throw new HttpException(
        `Duplicate display_order value: ${update.display_order}`,
        400,
      );
    }
    displayOrderSet.add(update.display_order);
  }
  // Update display_order atomically in transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    for (const update of updates) {
      await prisma.shopping_mall_product_images.update({
        where: { id: update.id },
        data: {
          display_order: update.display_order,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
  });
  // Fetch updated images ordered by display_order
  const updatedImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Transform dates to ISO string format
  const data = updatedImages.map((img) => ({
    id: img.id as string & tags.Format<"uuid">,
    image_url: img.image_url,
    display_order: img.display_order,
    created_at: toISOStringSafe(img.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(img.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: img.deleted_at
      ? (toISOStringSafe(img.deleted_at) as string & tags.Format<"date-time">)
      : null,
  }));
  // Prepare pagination info
  const pagination = {
    current: 1,
    limit: 20,
    records: data.length,
    pages: 1,
  } satisfies IPage.IPagination;
  return { pagination, data };
}
