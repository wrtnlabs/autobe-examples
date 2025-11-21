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
  const { page = 1, limit = 100 } = props.body as unknown as {
    page?: number;
    limit?: number;
  };
  const skip = (page - 1) * limit;

  // Query for product images associated with the specified product ID
  // Exclude deleted images (deleted_at IS NOT NULL)
  const [images, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { sort_order: "asc" },
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    }),
  ]);

  return {
    data: images.map((image) => ({
      id: image.id,
      image_url: image.image_url,
      sort_order: image.sort_order,
      is_primary: image.is_primary,
      shopping_mall_product_id:
        image.shopping_mall_product_id !== null
          ? (image.shopping_mall_product_id satisfies string as string)
          : undefined,
      shopping_mall_product_variant_id:
        image.shopping_mall_product_variant_id !== null
          ? (image.shopping_mall_product_variant_id satisfies string as string)
          : undefined,
      alt_text:
        image.alt_text !== null
          ? (image.alt_text satisfies string as string)
          : undefined,
      created_at: toISOStringSafe(image.created_at),
      updated_at: toISOStringSafe(image.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
