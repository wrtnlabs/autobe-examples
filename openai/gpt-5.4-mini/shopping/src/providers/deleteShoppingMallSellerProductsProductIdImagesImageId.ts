import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const product = await prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
    if (product.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const image = await prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
    if (image.shopping_mall_product_id !== props.productId) {
      throw new HttpException("Forbidden", 403);
    }
    const remaining = await prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        id: {
          not: props.imageId,
        },
      },
      orderBy: {
        display_order: "asc",
      },
      select: {
        id: true,
      },
    });
    await prisma.shopping_mall_product_images.delete({
      where: {
        id: props.imageId,
      },
    });
    for (let index = 0; index < remaining.length; index += 1) {
      await prisma.shopping_mall_product_images.update({
        where: {
          id: remaining[index].id,
        },
        data: {
          display_order: index,
        },
      });
    }
  });
}
