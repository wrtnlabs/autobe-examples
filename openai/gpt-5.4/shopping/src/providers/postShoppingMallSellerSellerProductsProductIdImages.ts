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

export async function postShoppingMallSellerSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.seller.id,
    },
    select: {
      id: true,
      suspended: true,
      banned: true,
    },
  });
  if (seller.suspended === true || seller.banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existing = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: {
      sequence: "asc",
    },
    select: {
      id: true,
      sequence: true,
      is_thumbnail: true,
    },
  });
  const insertionSequence =
    props.body.sequence === undefined ? existing.length : props.body.sequence;
  if (insertionSequence < 0 || insertionSequence > existing.length) {
    throw new HttpException("Invalid image sequence", 400);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    if (existing.length !== 0) {
      await tx.shopping_mall_product_images.updateMany({
        where: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
          sequence: {
            gte: insertionSequence,
          },
        },
        data: {
          sequence: {
            increment: 1,
          },
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
    if (existing.length === 0 || props.body.is_thumbnail === true) {
      await tx.shopping_mall_product_images.updateMany({
        where: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
          is_thumbnail: true,
        },
        data: {
          is_thumbnail: false,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
    const image = await tx.shopping_mall_product_images.create({
      data: {
        id: v4(),
        image_uri: props.body.image_uri,
        sequence: insertionSequence,
        is_thumbnail:
          existing.length === 0 ? true : (props.body.is_thumbnail ?? false),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
        product: {
          connect: {
            id: product.id,
          },
        },
      },
      ...ShoppingMallProductImageTransformer.select(),
    });
    await tx.shopping_mall_products.update({
      where: {
        id: product.id,
      },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    });
    const snapshot = await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4(),
        product: {
          connect: {
            id: product.id,
          },
        },
        created_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
      },
    });
    const gallery = await tx.shopping_mall_product_images.findMany({
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
    for (const item of gallery) {
      await tx.shopping_mall_product_snapshot_image_copies.create({
        data: {
          id: v4(),
          image_uri: item.image_uri,
          sequence: item.sequence,
          thumbnail: item.is_thumbnail,
          created_at: toISOStringSafe(new Date()),
          productSnapshot: {
            connect: {
              id: snapshot.id,
            },
          },
        },
      });
    }
    return image;
  });
  return await ShoppingMallProductImageTransformer.transform(created);
}
