import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function putShoppingMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IReorderRequest;
}): Promise<IShoppingMallProductImage.IReorderResponse> {
  // Ensure seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Validate image IDs belong to product and positions are unique/valid
  const imagesInDb =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const imageIds = new Set(imagesInDb.map((img) => img.id));
  const positions = new Set<number>();
  for (const item of props.body.images) {
    if (!imageIds.has(item.id)) {
      throw new HttpException("Image does not belong to this product", 400);
    }
    if (item.position < 0 || item.position > 9) {
      throw new HttpException("Position must be between 0 and 9", 400);
    }
    if (positions.has(item.position)) {
      throw new HttpException("Duplicate position values not allowed", 400);
    }
    positions.add(item.position);
  }
  // Atomically update all image positions within transaction
  await MyGlobal.prisma.$transaction(
    props.body.images.map((item) =>
      MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: item.id },
        data: { position: item.position },
      }),
    ),
  );
  // Snapshot is automatically created by the system via Prisma triggers
  // as defined in 12-snapshot-principle.md: every product edit triggers snapshot
  return { success: true };
}
