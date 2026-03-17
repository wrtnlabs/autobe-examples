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

export async function deleteShoppingMallSellerSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
    },
    select: {
      id: true,
      banned: true,
      suspended: true,
      deleted_at: true,
    },
  });
  if (seller === null || seller.deleted_at !== null || seller.banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.suspended === true) {
    throw new HttpException(
      "Suspended sellers cannot delete product images",
      403,
    );
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product is deleted", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const target = await prisma.shopping_mall_product_images.findFirst({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
    if (target === null || target.deleted_at !== null) {
      throw new HttpException(
        "Product image is already absent from the gallery",
        400,
      );
    }
    const now = new globalThis.Date().toISOString();
    await prisma.shopping_mall_product_images.update({
      where: {
        id: target.id,
      },
      data: {
        updated_at: new globalThis.Date(now),
        deleted_at: new globalThis.Date(now),
      },
    });
    const remaining = await prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: [
        {
          sequence: "asc",
        },
        {
          created_at: "asc",
        },
      ],
      select: {
        id: true,
        sequence: true,
        is_thumbnail: true,
        image_uri: true,
      },
    });
    for (const [index, image] of remaining.entries()) {
      const shouldBeThumbnail = index === 0;
      if (
        image.sequence !== index ||
        image.is_thumbnail !== shouldBeThumbnail
      ) {
        await prisma.shopping_mall_product_images.update({
          where: {
            id: image.id,
          },
          data: {
            sequence: index,
            is_thumbnail: shouldBeThumbnail,
            updated_at: new globalThis.Date(now),
          },
        });
      }
    }
    const snapshot = await prisma.shopping_mall_product_snapshots.create({
      data: {
        id: v4(),
        product: {
          connect: {
            id: props.productId,
          },
        },
        created_at: new globalThis.Date(now),
      },
      select: {
        id: true,
      },
    });
    if (remaining.length !== 0) {
      await prisma.shopping_mall_product_snapshot_image_copies.createMany({
        data: remaining.map((image, index) => ({
          id: v4(),
          shopping_mall_product_snapshot_id: snapshot.id,
          sequence: index,
          image_uri: image.image_uri,
          thumbnail: index === 0,
          created_at: new globalThis.Date(now),
        })),
      });
    }
  });
}
