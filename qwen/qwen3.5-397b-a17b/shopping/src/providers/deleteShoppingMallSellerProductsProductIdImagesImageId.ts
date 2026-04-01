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
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      deleted_at: true,
      product: {
        select: {
          id: true,
          seller_id: true,
          deleted_at: true,
        },
      },
    },
  });
  if (image === null || image.deleted_at !== null) {
    throw new HttpException("Image not found or already deleted", 404);
  }
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Image does not belong to the specified product",
      404,
    );
  }
  if (image.product === null || image.product.deleted_at !== null) {
    throw new HttpException("Product not found or deleted", 404);
  }
  if (image.product.seller_id !== props.seller.id) {
    throw new HttpException("You do not own this product", 403);
  }
  const activeImageCount =
    await MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (activeImageCount <= 1) {
    throw new HttpException("Cannot delete the last remaining image", 400);
  }
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
    },
  });
  const productForSnapshot =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        name: true,
        description: true,
        base_price: true,
        category_id: true,
      },
    });
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        variantOptions: {
          select: {
            shopping_mall_product_option_value_id: true,
          },
        },
      },
    });
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      shopping_mall_category_id: productForSnapshot.category_id,
      name: productForSnapshot.name,
      description: productForSnapshot.description,
      base_price: productForSnapshot.base_price,
      created_at: new Date(),
      snapshotVariants: {
        create: variants.map((variant) => ({
          id: v4() as string & tags.Format<"uuid">,
          sku_code: variant.sku_code,
          price_override: variant.price_override,
          stock_quantity: 0,
          created_at: new Date(),
          snapshotVariantOptions: {
            create: variant.variantOptions.map(
              (opt: { shopping_mall_product_option_value_id: string }) => ({
                id: v4() as string & tags.Format<"uuid">,
                shopping_mall_product_option_value_id:
                  opt.shopping_mall_product_option_value_id,
                created_at: new Date(),
              }),
            ),
          },
        })),
      },
    },
  });
}
