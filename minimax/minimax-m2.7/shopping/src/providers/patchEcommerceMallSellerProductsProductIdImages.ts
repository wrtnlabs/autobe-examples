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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IRequest;
}): Promise<IPageIEcommerceMallProductImage.ISummary> {
  // Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Check ownership
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting parameters
  const sortBy = props.body.sortBy ?? "display_order";
  const order = props.body.order ?? "asc";
  // Query images with pagination
  const orderByInput = { [sortBy]: order } as Record<string, "asc" | "desc">;
  const data = await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
    where: { product_id: props.productId },
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      image_url: true,
      display_order: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_product_images.count({
    where: { product_id: props.productId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((item) => ({
      id: item.id,
      image_url: item.image_url,
      display_order: item.display_order,
      created_at: item.created_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
  };
}
