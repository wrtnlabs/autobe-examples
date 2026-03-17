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
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // 1. Fetch product record (including category name for snapshot)
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        deleted_at: true,
        category: {
          select: { name: true },
        },
      },
    });
  // 2. Check not deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 3. Ownership check
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Fetch the image, scoped to this product (throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
    },
    select: { id: true },
  });
  // 5. Sequence conflict check (if sequence is being updated)
  if (props.body.sequence !== undefined) {
    const conflicting =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          sequence: props.body.sequence,
          id: { not: props.imageId },
        },
        select: { id: true },
      });
    if (conflicting !== null) {
      throw new HttpException(
        "Sequence conflict: another image already uses this sequence value",
        409,
      );
    }
  }
  // 6. Apply the update to the image record
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.url !== undefined && { url: props.body.url }),
      ...(props.body.sequence !== undefined && {
        sequence: props.body.sequence,
      }),
    },
  });
  // 7. Update product updated_at
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: { updated_at: new Date() },
  });
  // 8. Gather current images for snapshot (after update)
  const currentImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { url: true, sequence: true },
      orderBy: { sequence: "asc" },
    });
  // 9. Gather current active variants with options for snapshot
  const currentVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        price_override: true,
        options: {
          select: {
            key: true,
            value: true,
            sequence: true,
          },
        },
      },
    });
  // 10. Create the product snapshot capturing full current state
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      product_id: product.id,
      category_id: product.shopping_mall_category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category_name: product.category?.name ?? null,
      created_at: now,
      snapshotImages: {
        createMany: {
          data: currentImages.map((img) => ({
            id: v4(),
            url: img.url,
            sequence: img.sequence,
            created_at: now,
          })),
        },
      },
      snapshotSkuses: {
        create: currentVariants.map((variant) => ({
          id: v4(),
          product_variant_id: variant.id,
          sku_code: variant.sku,
          price: variant.price_override ?? product.base_price,
          created_at: now,
          options: {
            createMany: {
              data: variant.options.map((opt) => ({
                id: v4(),
                sequence: opt.sequence,
                key: opt.key,
                value: opt.value,
              })),
            },
          },
        })),
      },
    },
  });
  // 11. Fetch and return the updated image via transformer
  const updatedImage =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return ShoppingMallProductImageTransformer.transform(updatedImage);
}
