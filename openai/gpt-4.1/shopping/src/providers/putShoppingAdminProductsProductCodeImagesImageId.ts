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

export async function putShoppingAdminProductsProductCodeImagesImageId(props: {
  admin: AdminPayload;
  productCode: string;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingProductImage.IUpdate;
}): Promise<IShoppingProductImage> {
  // 1. Find product by code
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Find image by id
  const image = await MyGlobal.prisma.shopping_product_images.findUnique({
    where: { id: props.imageId },
    select: { id: true, shopping_product_id: true },
  });
  if (!image) {
    throw new HttpException("Product image not found", 404);
  }
  // 3. Ensure image belongs to the correct product
  if (image.shopping_product_id !== product.id) {
    throw new HttpException(
      "Image does not belong to the specified product",
      404,
    );
  }
  // 4. Validate image_uri if present
  if (props.body.image_uri !== undefined) {
    const uri = props.body.image_uri;
    if (!/(\.jpg|\.jpeg|\.png)$/i.test(uri)) {
      throw new HttpException(
        "File type must be JPEG or PNG (.jpg, .jpeg, .png)",
        400,
      );
    }
    // (File size check not feasible here; presumed handled during file upload)
  }
  // 5. Update the image record
  const updated = await MyGlobal.prisma.shopping_product_images.update({
    where: { id: props.imageId },
    data: {
      image_uri: props.body.image_uri ?? undefined,
      order_index: props.body.order_index ?? undefined,
    },
  });
  // 6. Return normalized output
  return {
    id: updated.id,
    shopping_product_id: updated.shopping_product_id,
    image_uri: updated.image_uri,
    order_index: updated.order_index ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
