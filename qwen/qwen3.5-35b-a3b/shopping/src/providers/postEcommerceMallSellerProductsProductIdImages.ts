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
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage> {
  // Validate product exists and is not soft-deleted
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
    });
  // Verify product ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate display_order is non-negative
  if (props.body.display_order < 0) {
    throw new HttpException("Display order must be non-negative", 400);
  }
  // Create product image using collector
  const created = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: await EcommerceMallProductImageCollector.collect({
      body: props.body,
      ecommerceMallProducts: product,
    }),
    ...EcommerceMallProductImageTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallProductImageTransformer.transform(created);
}
