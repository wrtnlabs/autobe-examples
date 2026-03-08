import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage.ISummary> {
  // Validate request body has at least one field
  if (
    props.body.display_order === undefined &&
    props.body.image_url === undefined
  ) {
    throw new HttpException(
      "At least one property (display_order or image_url) must be provided",
      400,
    );
  }
  // Verify product exists and get seller_id
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        is_active: true,
      },
    });
  // Capture current images for snapshot (old values)
  const currentImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  if (currentImages.length === 0) {
    throw new HttpException("No images found for this product", 404);
  }
  // Update the product images
  await MyGlobal.prisma.ecommerce_mall_product_images.updateMany({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    data: {
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
      ...(props.body.image_url !== undefined && {
        image_url: props.body.image_url,
      }),
      updated_at: new Date(),
    },
  });
  // Create snapshot for audit trail
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      product_id: props.productId,
      category_id: product.category_id,
      seller_id: product.seller_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      is_active: product.is_active,
      created_at: new Date(),
    },
  });
  // Return updated first image
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductImageAtSummaryTransformer.select(),
      take: 1,
    });
  if (updatedImages.length === 0) {
    throw new HttpException("Images not found after update", 404);
  }
  return await EcommerceMallProductImageAtSummaryTransformer.transform(
    updatedImages[0],
  );
}
