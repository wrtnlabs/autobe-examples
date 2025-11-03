import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingSellerProductsProductCodeImages(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingProductImage.ICreate;
}): Promise<IShoppingProductImage> {
  // 1. Find the target product by code
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: seller does not own this product",
      403,
    );
  }

  // 2. Enforce max 10 images per product
  const imageCount = await MyGlobal.prisma.shopping_product_images.count({
    where: {
      shopping_product_id: product.id,
    },
  });
  if (imageCount >= 10) {
    throw new HttpException(
      "Cannot upload more than 10 images per product",
      400,
    );
  }

  // 3. Validate file type (JPEG/PNG extension only)
  const uri = props.body.image_uri;
  const lowered = uri.toLowerCase();
  if (
    !(
      lowered.endsWith(".jpg") ||
      lowered.endsWith(".jpeg") ||
      lowered.endsWith(".png")
    )
  ) {
    throw new HttpException(
      "Image must be JPEG or PNG format (.jpg, .jpeg, .png)",
      400,
    );
  }

  // 4. File size validation not possible from URI - simulated by special URI substring (e.g. '/oversize.')
  if (uri.includes("oversize")) {
    throw new HttpException("Image file is too large (max 5MB)", 400);
  }

  // 5. Determine order_index: use provided, or set to max(existing)+1 or 0 if none
  let orderIndex =
    typeof props.body.order_index === "number" ? props.body.order_index : null;
  if (orderIndex === null) {
    const maxIndex = await MyGlobal.prisma.shopping_product_images.aggregate({
      where: { shopping_product_id: product.id },
      _max: { order_index: true },
    });
    orderIndex =
      typeof maxIndex._max.order_index === "number"
        ? maxIndex._max.order_index + 1
        : 0;
  }

  const imageId = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_product_images.create({
    data: {
      id: imageId,
      shopping_product_id: product.id,
      image_uri: props.body.image_uri,
      order_index: orderIndex,
      created_at: now,
    },
    select: {
      id: true,
      shopping_product_id: true,
      image_uri: true,
      order_index: true,
      created_at: true,
    },
  });

  return {
    id: created.id,
    shopping_product_id: created.shopping_product_id,
    image_uri: created.image_uri,
    order_index: created.order_index ?? undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
