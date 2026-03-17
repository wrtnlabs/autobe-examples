import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IRequest;
}): Promise<IPageIEcommerceMallProductImage.ISummary> {
  // Validate product exists and is not deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  // Build where clause for images
  const whereInput: Prisma.ecommerce_mall_product_imagesWhereInput = {
    ecommerce_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.is_primary != null && {
      is_primary: props.body.is_primary,
    }),
    ...(props.body.sort_order_min !== undefined && {
      sort_order: {
        gte: props.body.sort_order_min,
      },
    }),
    ...(props.body.sort_order_max !== undefined && {
      sort_order: {
        lte: props.body.sort_order_max,
      },
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch images with pagination
  const images = await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { sort_order: "asc" },
    ...EcommerceMallProductImageAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_images.count({
    where: whereInput,
  });
  // Transform images to response DTO
  const data = await ArrayUtil.asyncMap(
    images,
    EcommerceMallProductImageAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallProductImage.ISummary;
}
