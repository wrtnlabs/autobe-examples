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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string;
  body: IShoppingMallProductImage.IOrder;
}): Promise<IPageIShoppingMallProductImage> {
  // Validate product exists and get seller info
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId as string & tags.Format<"uuid"> },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Get current images with display_order information
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: {
      shopping_mall_product_id: props.productId as string & tags.Format<"uuid">,
    },
    orderBy: {
      display_order: "asc",
    },
    select: {
      id: true,
      display_order: true,
      image_url: true,
    },
  });
  // Create a map of image id to display order from the request
  const orderMap = new Map<string, number>();
  const orderItems = Array.isArray(props.body)
    ? props.body
    : (props.body as any).items || [];
  for (const item of orderItems) {
    orderMap.set(item.id, item.display_order);
  }
  // Update display_order for each image
  const updatedImages = await Promise.all(
    images.map(async (image) => {
      const newOrder = orderMap.get(image.id) ?? image.display_order;
      return await MyGlobal.prisma.shopping_mall_product_images.update({
        where: {
          id: image.id as string & tags.Format<"uuid">,
        },
        data: {
          display_order: newOrder,
        },
        select: {
          id: true,
          shopping_mall_product_id: true,
          display_order: true,
          image_url: true,
        },
      });
    }),
  );
  // Map to response format
  const data = updatedImages.map((image) => ({
    id: image.id as string & tags.Format<"uuid">,
    product_id: image.shopping_mall_product_id as string & tags.Format<"uuid">,
    display_order: image.display_order,
    image_url: image.image_url,
    created_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  }));
  const total = data.length;
  const limit = total;
  const pages = total > 0 ? 1 : 0;
  return {
    data,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages,
    },
  };
}
