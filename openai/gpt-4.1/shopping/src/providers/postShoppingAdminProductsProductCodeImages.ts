import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminProductsProductCodeImages(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingProductImage.ICreate;
}): Promise<IShoppingProductImage> {
  // 1. Check product existence
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
  });
  if (!product) throw new HttpException("Product not found", 404);

  // 2. Max image limit (10)
  const imageCount = await MyGlobal.prisma.shopping_product_images.count({
    where: { shopping_product_id: product.id },
  });
  if (imageCount >= 10)
    throw new HttpException(
      "Cannot upload more than 10 images per product",
      409,
    );

  // 3. Image format validation (only JPEG/PNG)
  const uri = props.body.image_uri;
  const uriLc = uri.toLowerCase();
  if (
    !(
      uriLc.endsWith(".jpg") ||
      uriLc.endsWith(".jpeg") ||
      uriLc.endsWith(".png")
    )
  ) {
    throw new HttpException("Only JPEG or PNG images are allowed", 400);
  }

  // 4. Image size <=5MB (simulate with URI length for backend file size)
  if (uri.length > 5 * 1024 * 1024)
    throw new HttpException("Image exceeds 5MB maximum upload size", 400);

  // 5. Assign display index if not provided
  let order_index = props.body.order_index;
  if (order_index === undefined) {
    const maxOrder = await MyGlobal.prisma.shopping_product_images.findFirst({
      where: { shopping_product_id: product.id },
      orderBy: { order_index: "desc" },
      select: { order_index: true },
    });
    order_index = (maxOrder?.order_index ?? -1) + 1;
  }

  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.shopping_product_images.create({
    data: {
      id: id,
      shopping_product_id: product.id,
      image_uri: uri,
      order_index: order_index,
      created_at: now,
    },
  });

  return {
    id: created.id,
    shopping_product_id: created.shopping_product_id,
    image_uri: created.image_uri,
    order_index: created.order_index ?? undefined,
    created_at: now,
  };
}
