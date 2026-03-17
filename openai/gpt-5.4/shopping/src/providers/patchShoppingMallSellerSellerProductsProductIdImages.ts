import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: {
      id: true,
      suspended: true,
      banned: true,
      deleted_at: true,
    },
  });
  if (seller.banned === true || seller.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.suspended === true) {
    throw new HttpException("Forbidden", 403);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const current =
    await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
      where: {
        shopping_mall_product_id: props.productId,
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
  try {
    const updatedId = await MyGlobal.prisma.$transaction(async (tx) => {
      const timestamp = new Date();
      const nextImageUri = props.body.imageUri ?? current.image_uri;
      const requestedSequence = props.body.sequence ?? current.sequence;
      const requestedThumbnail = props.body.isThumbnail ?? current.is_thumbnail;
      const maxSequenceRow = await tx.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
        orderBy: {
          sequence: "desc",
        },
        select: {
          sequence: true,
        },
      });
      const temporarySequence = (maxSequenceRow?.sequence ?? 0) + 1;
      if (requestedSequence !== current.sequence) {
        const conflict = await tx.shopping_mall_product_images.findFirst({
          where: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
            sequence: requestedSequence,
            id: {
              not: current.id,
            },
          },
          select: {
            id: true,
          },
        });
        if (conflict !== null) {
          await tx.shopping_mall_product_images.update({
            where: { id: current.id },
            data: {
              sequence: temporarySequence,
              updated_at: timestamp,
            },
          });
          await tx.shopping_mall_product_images.update({
            where: { id: conflict.id },
            data: {
              sequence: current.sequence,
              updated_at: timestamp,
            },
          });
        }
      }
      await tx.shopping_mall_product_images.update({
        where: { id: current.id },
        data: {
          image_uri: nextImageUri,
          sequence: requestedSequence,
          is_thumbnail: requestedThumbnail,
          updated_at: timestamp,
        },
      });
      const firstActiveImage = await tx.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
        orderBy: {
          sequence: "asc",
        },
        select: {
          id: true,
        },
      });
      if (firstActiveImage !== null) {
        await tx.shopping_mall_product_images.updateMany({
          where: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
          data: {
            is_thumbnail: false,
            updated_at: timestamp,
          },
        });
        await tx.shopping_mall_product_images.update({
          where: { id: firstActiveImage.id },
          data: {
            is_thumbnail: true,
            updated_at: timestamp,
          },
        });
      }
      await tx.shopping_mall_products.update({
        where: { id: props.productId },
        data: {
          updated_at: timestamp,
        },
      });
      const snapshot = await tx.shopping_mall_product_snapshots.create({
        data: {
          id: v4(),
          product: {
            connect: {
              id: props.productId,
            },
          },
          created_at: timestamp,
        },
        select: {
          id: true,
        },
      });
      const resultingImages = await tx.shopping_mall_product_images.findMany({
        where: {
          shopping_mall_product_id: props.productId,
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
      for (const image of resultingImages) {
        await tx.shopping_mall_product_snapshot_image_copies.create({
          data: {
            id: v4(),
            productSnapshot: {
              connect: {
                id: snapshot.id,
              },
            },
            image_uri: image.image_uri,
            sequence: image.sequence,
            thumbnail: image.is_thumbnail,
            created_at: timestamp,
          },
        });
      }
      return current.id;
    });
    const updated =
      await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
        where: { id: updatedId },
        ...ShoppingMallProductImageTransformer.select(),
      });
    return await ShoppingMallProductImageTransformer.transform(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Sequence already exists", 409);
    }
    throw error;
  }
}
