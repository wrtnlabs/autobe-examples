import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberProductImagesProductImageId(props: {
  member: MemberPayload;
  productImageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const { member, productImageId, body } = props;
  const existing =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: productImageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        display_order: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: existing.shopping_mall_product_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.shopping_mall_product_imagesUpdateInput = {
    ...(body.href !== undefined ? { href: body.href } : {}),
    ...(body.alt_text !== undefined ? { alt_text: body.alt_text } : {}),
    ...(body.display_order !== undefined
      ? { display_order: body.display_order }
      : {}),
  };
  if (body.href !== undefined && body.href.trim().length < 1) {
    throw new HttpException("href must not be empty", 400);
  }
  if (body.alt_text !== undefined && body.alt_text.trim().length < 1) {
    throw new HttpException("alt_text must not be empty", 400);
  }
  if (
    body.display_order !== undefined &&
    (!Number.isInteger(body.display_order) || body.display_order < 0)
  ) {
    throw new HttpException("display_order must be an integer >= 0", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_images.update({
      where: { id: productImageId },
      data: updateData,
    });
    if (body.display_order !== undefined) {
      const images = await tx.shopping_mall_product_images.findMany({
        where: {
          shopping_mall_product_id: existing.shopping_mall_product_id,
          deleted_at: null,
        },
        select: { id: true, display_order: true },
      });
      images.sort(
        (a, b) => a.display_order - b.display_order || (a.id < b.id ? -1 : 1),
      );
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.display_order !== i) {
          await tx.shopping_mall_product_images.update({
            where: { id: img.id },
            data: { display_order: i },
          });
        }
      }
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: productImageId },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return ShoppingMallProductImageTransformer.transform(updated);
}
