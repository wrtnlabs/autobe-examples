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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage> {
  const { seller, productId, body } = props;

  // Authorization: Verify product belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or you do not have permission to access it",
      404,
    );
  }

  // Pagination setup with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Execute queries with inline parameters (MANDATORY)
  const [images, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: productId,
        ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
        ...(body.sku_id !== undefined &&
          body.sku_id !== null && {
            shopping_mall_sku_id: body.sku_id,
          }),
      },
      orderBy: { display_order: "asc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: productId,
        ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
        ...(body.sku_id !== undefined &&
          body.sku_id !== null && {
            shopping_mall_sku_id: body.sku_id,
          }),
      },
    }),
  ]);

  // Transform database results to API format
  const data: IShoppingMallProductImage[] = images.map((image) => ({
    id: image.id as string & tags.Format<"uuid">,
    shopping_mall_product_id: image.shopping_mall_product_id as string &
      tags.Format<"uuid">,
    shopping_mall_sku_id:
      image.shopping_mall_sku_id === null
        ? undefined
        : (image.shopping_mall_sku_id as string & tags.Format<"uuid">),
    image_url: image.image_url,
    display_order: image.display_order,
    is_primary: image.is_primary,
    alt_text: image.alt_text === null ? undefined : image.alt_text,
    created_at: toISOStringSafe(image.created_at),
  }));

  // Build pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
