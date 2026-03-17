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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const now = toISOStringSafe(new globalThis.Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const product = await tx.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
    if (product.deleted_at !== null) {
      throw new HttpException("Product not found", 404);
    }
    if (product.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (
      props.body.shopping_mall_category_id !== undefined &&
      props.body.shopping_mall_category_id !== null
    ) {
      const category = await tx.shopping_mall_categories.findUnique({
        where: { id: props.body.shopping_mall_category_id },
        select: {
          id: true,
          deleted_at: true,
        },
      });
      if (category === null || category.deleted_at !== null) {
        throw new HttpException("Invalid category reference", 400);
      }
    }
    try {
      const snapshot = await tx.shopping_mall_product_snapshots.create({
        data: {
          id: v4(),
          product: {
            connect: {
              id: props.productId,
            },
          },
          created_at: now,
        },
        select: {
          id: true,
        },
      });
      const images = await tx.shopping_mall_product_images.findMany({
        where: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
        select: {
          id: true,
          image_uri: true,
          sequence: true,
          is_thumbnail: true,
        },
        orderBy: {
          sequence: "asc",
        },
      });
      for (const image of images) {
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
            created_at: now,
          },
        });
      }
      const variants = await tx.shopping_mall_product_variants.findMany({
        where: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      for (const variant of variants) {
        await tx.shopping_mall_product_variant_snapshots.create({
          data: {
            id: v4(),
            productVariant: {
              connect: {
                id: variant.id,
              },
            },
            productSnapshot: {
              connect: {
                id: snapshot.id,
              },
            },
            change_summary: "Product variant snapshot created",
            created_at: now,
          },
        });
      }
    } catch {
      throw new HttpException("Product update could not be completed", 400);
    }
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: {
        ...(props.body.shopping_mall_category_id !== undefined
          ? {
              category:
                props.body.shopping_mall_category_id === null
                  ? { disconnect: true }
                  : {
                      connect: {
                        id: props.body.shopping_mall_category_id,
                      },
                    },
            }
          : {}),
        ...(props.body.name !== undefined
          ? {
              name: props.body.name,
            }
          : {}),
        ...(props.body.description !== undefined
          ? {
              description: props.body.description,
            }
          : {}),
        ...(props.body.base_price !== undefined
          ? {
              base_price: props.body.base_price,
            }
          : {}),
        ...(props.body.status !== undefined
          ? {
              status: props.body.status,
            }
          : {}),
        updated_at: now,
      },
    });
    const updated = await tx.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
    return await ShoppingMallProductTransformer.transform(updated);
  });
}
