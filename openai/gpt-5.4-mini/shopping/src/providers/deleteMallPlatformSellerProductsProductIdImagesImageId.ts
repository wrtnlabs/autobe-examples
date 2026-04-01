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

export async function deleteMallPlatformSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
        deleted_at: true,
        images: {
          where: {
            deleted_at: null,
          },
          orderBy: {
            sort_order: "asc",
          },
          select: {
            id: true,
            image_url: true,
            sort_order: true,
            is_main: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product is unavailable", 400);
  }
  const target = product.images.find((image) => image.id === props.imageId);
  if (target === undefined) {
    throw new HttpException("Unavailable image target", 400);
  }
  const remaining = product.images.filter(
    (image) => image.id !== props.imageId,
  );
  const timestamp = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.mall_platform_product_image_snapshots.create({
      data: {
        id: v4(),
        mall_platform_product_id: props.productId,
        image_url: target.image_url,
        image_order: target.sort_order,
        is_main: target.is_main,
        changed_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
    });
    await tx.mall_platform_product_images.delete({
      where: {
        id: props.imageId,
      },
    });
    for (let index = 0; index < remaining.length; index += 1) {
      const image = remaining[index];
      await tx.mall_platform_product_images.update({
        where: {
          id: image.id,
        },
        data: {
          sort_order: index + 1,
          is_main: index === 0,
          updated_at: timestamp,
        },
      });
    }
  });
}
