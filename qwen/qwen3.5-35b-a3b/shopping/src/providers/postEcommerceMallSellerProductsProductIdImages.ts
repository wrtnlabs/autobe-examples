import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage.ICreate> {
  // Validate product exists and is owned by seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
        is_active: true,
      },
      select: {
        id: true,
        seller_id: true,
        name: true,
        description: true,
        base_price: true,
        is_active: true,
        category_id: true,
      },
    });
  // Count existing active images
  const existingCount =
    await MyGlobal.prisma.ecommerce_mall_product_images.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    });
  // Validate 20-image limit
  if (existingCount + 1 > 20) {
    throw new HttpException("Maximum 20 images per product allowed", 400);
  }
  // Create image
  const created = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: await EcommerceMallProductImageCollector.collect({
      body: props.body,
      ecommerceMallProducts: {
        id: props.productId,
      } as IEntity,
    }),
    select: {
      id: true,
      image_url: true,
      display_order: true,
    },
  });
  // Create snapshot
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product_id: props.productId,
      category_id: product.category_id,
      seller_id: props.seller.id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      is_active: product.is_active,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  return {
    image_url: created.image_url,
    display_order: created.display_order,
  } satisfies IEcommerceMallProductImage.ICreate;
}
