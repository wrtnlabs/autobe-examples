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

export async function patchShoppingMallCustomerProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage> {
  const { productId } = props;

  // Fetch paginated images for the product
  const page = 1; // Default page
  const limit = 10; // Default limit

  // Inline where clause for Prisma query
  const whereCondition = {
    shopping_mall_product_id: productId,
    deleted_at: null,
  };

  // Fetch total count and data in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: whereCondition,
      orderBy: {
        sort_order: "asc",
        created_at: "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({
      where: whereCondition,
    }),
  ]);

  // Transform data to match IShoppingMallProductImage type
  const transformedData = data.map((image) => ({
    id: image.id,
    image_url: image.image_url,
    sort_order: image.sort_order,
    is_primary: image.is_primary,
    shopping_mall_product_id:
      image.shopping_mall_product_id !== null &&
      image.shopping_mall_product_id !== undefined
        ? image.shopping_mall_product_id
        : "",
    shopping_mall_product_variant_id:
      image.shopping_mall_product_variant_id !== null &&
      image.shopping_mall_product_variant_id !== undefined
        ? image.shopping_mall_product_variant_id
        : "",
    alt_text:
      image.alt_text !== null && image.alt_text !== undefined
        ? image.alt_text
        : "",
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
