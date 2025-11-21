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

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  // First, verify the product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition with proper date handling
  const where: Prisma.shopping_mall_product_imagesWhereInput = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { alt_text: { contains: props.body.search, mode: "insensitive" } },
        { image_url: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.is_primary !== undefined && {
      is_primary: props.body.is_primary,
    }),
    ...((props.body.display_order_min !== undefined ||
      props.body.display_order_max !== undefined) && {
      display_order: {
        ...(props.body.display_order_min !== undefined && {
          gte: props.body.display_order_min,
        }),
        ...(props.body.display_order_max !== undefined && {
          lte: props.body.display_order_max,
        }),
      },
    }),
    ...((props.body.created_at_min !== undefined ||
      props.body.created_at_max !== undefined) && {
      created_at: {
        ...(props.body.created_at_min !== undefined && {
          gte: props.body.created_at_min,
        }),
        ...(props.body.created_at_max !== undefined && {
          lte: props.body.created_at_max,
        }),
      },
    }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where,
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((image) => ({
      id: image.id,
      image_url: image.image_url,
      alt_text: image.alt_text ?? undefined,
      is_primary: image.is_primary,
      display_order: image.display_order,
    })),
  };
}
