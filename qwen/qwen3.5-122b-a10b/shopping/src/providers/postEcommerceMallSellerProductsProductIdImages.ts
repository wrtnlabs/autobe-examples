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
import { EcommerceMallProductImageCollector } from "../collectors/EcommerceMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage> {
  // Verify product exists and belongs to authenticated seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Count existing images to determine sort_order
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { sort_order: true },
      orderBy: { sort_order: "desc" },
      take: 1,
    });
  const sortOrder =
    existingImages.length > 0 ? existingImages[0].sort_order + 1 : 0;
  const isPrimary = sortOrder === 0;
  // Create image record using collector
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: await EcommerceMallProductImageCollector.collect({
      body: props.body,
      ecommerceMallProducts: product,
      ecommerceMallSellers: { id: props.seller.id },
      ecommerceMallSellerSessions: { id: props.seller.session_id },
    }),
    ...EcommerceMallProductImageTransformer.select(),
  });
  // Update sort_order and is_primary based on position
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: image.id },
    data: {
      sort_order: sortOrder,
      is_primary: isPrimary,
      updated_at: new Date(),
    },
  });
  // Create product snapshot
  const allImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true, url: true, sort_order: true, is_primary: true },
      orderBy: { sort_order: "asc" },
    });
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      created_at: new Date(),
      previous_values: JSON.stringify({}),
      current_values: JSON.stringify({ images: allImages }),
      seller: { connect: { id: props.seller.id } },
      product: { connect: { id: props.productId } },
    } satisfies Prisma.ecommerce_mall_product_snapshotsCreateInput,
  });
  // Refresh and transform the created image
  const refreshed =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: image.id },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(refreshed);
}
