import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProduct> {
  if (
    props.body.imageUri === undefined &&
    props.body.sequence === undefined &&
    props.body.isThumbnail === undefined
  ) {
    throw new HttpException("At least one image update field is required", 400);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  const activeImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
      orderBy: {
        sequence: "asc",
      },
      select: {
        id: true,
        image_uri: true,
        sequence: true,
        is_thumbnail: true,
      },
    });
  if (activeImages.length === 0) {
    throw new HttpException("No active product images to update", 400);
  }
  const targetId = activeImages[0].id;
  const currentIndex = activeImages.findIndex((image) => image.id === targetId);
  const boundedIndex =
    props.body.sequence === undefined
      ? currentIndex
      : props.body.sequence < 0
        ? 0
        : props.body.sequence >= activeImages.length
          ? activeImages.length - 1
          : props.body.sequence;
  const reordered = activeImages
    .filter((image) => image.id !== targetId)
    .map((image) => ({
      id: image.id,
      image_uri: image.image_uri,
    }));
  const targetImage = activeImages.find((image) => image.id === targetId);
  if (targetImage === undefined) {
    throw new HttpException("Target product image not found", 400);
  }
  reordered.splice(props.body.isThumbnail === true ? 0 : boundedIndex, 0, {
    id: targetImage.id,
    image_uri:
      props.body.imageUri === undefined
        ? targetImage.image_uri
        : props.body.imageUri,
  });
  const normalized = reordered.map((image, index) => ({
    id: image.id,
    image_uri: image.image_uri,
    sequence: index,
    is_thumbnail: index === 0,
  }));
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const image of normalized) {
      await tx.shopping_mall_product_images.update({
        where: {
          id: image.id,
        },
        data: {
          sequence: image.sequence + normalized.length,
          updated_at: now,
        },
      });
    }
    for (const image of normalized) {
      await tx.shopping_mall_product_images.update({
        where: {
          id: image.id,
        },
        data: {
          image_uri: image.image_uri,
          sequence: image.sequence,
          is_thumbnail: image.is_thumbnail,
          updated_at: now,
        },
      });
    }
    await tx.shopping_mall_products.update({
      where: {
        id: product.id,
      },
      data: {
        updated_at: now,
      },
    });
    const snapshotId = v4();
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        product: {
          connect: {
            id: product.id,
          },
        },
        created_at: now,
      },
    });
    const finalImages = await tx.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
      orderBy: {
        sequence: "asc",
      },
      select: {
        image_uri: true,
        sequence: true,
        is_thumbnail: true,
      },
    });
    for (const image of finalImages) {
      await tx.shopping_mall_product_snapshot_image_copies.create({
        data: {
          id: v4(),
          productSnapshot: {
            connect: {
              id: snapshotId,
            },
          },
          sequence: image.sequence,
          image_uri: image.image_uri,
          thumbnail: image.is_thumbnail,
          created_at: now,
        },
      });
    }
  });
  const refreshed =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: product.id,
      },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(refreshed);
}
