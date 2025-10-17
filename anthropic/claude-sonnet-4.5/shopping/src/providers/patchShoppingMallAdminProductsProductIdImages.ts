import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdImages(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage> {
  const { admin, productId, body } = props;

  // Verify product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Prepare pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Execute queries concurrently with inline where clause
  const [images, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: productId,
        ...(body.is_primary !== undefined && {
          is_primary: body.is_primary,
        }),
        ...(body.sku_id !== undefined &&
          body.sku_id !== null && {
            shopping_mall_sku_id: body.sku_id,
          }),
      },
      orderBy: { display_order: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: productId,
        ...(body.is_primary !== undefined && {
          is_primary: body.is_primary,
        }),
        ...(body.sku_id !== undefined &&
          body.sku_id !== null && {
            shopping_mall_sku_id: body.sku_id,
          }),
      },
    }),
  ]);

  // Transform Prisma results to API response format
  const data: IShoppingMallProductImage[] = images.map((img) => ({
    id: img.id as string & tags.Format<"uuid">,
    shopping_mall_product_id: img.shopping_mall_product_id as string &
      tags.Format<"uuid">,
    shopping_mall_sku_id:
      img.shopping_mall_sku_id === null
        ? undefined
        : (img.shopping_mall_sku_id as string & tags.Format<"uuid">),
    image_url: img.image_url,
    display_order: img.display_order,
    is_primary: img.is_primary,
    alt_text: img.alt_text === null ? undefined : img.alt_text,
    created_at: toISOStringSafe(img.created_at),
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
