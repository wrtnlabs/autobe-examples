import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
  // Verify product exists and get ID
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
  // Verify seller owns the product (cross-seller protection)
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - you do not own this product", 403);
  }
  // Verify product is not deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  // Collect data using Collector pattern
  const data = await EcommerceMallProductImageCollector.collect({
    body: props.body,
    ecommerceMallProducts: { id: product.id },
  });
  // Create the image record
  const created = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data,
  });
  // Reload with complete relations for transformer
  const complete =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: created.id },
      ...EcommerceMallProductImageTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallProductImageTransformer.transform(complete);
}
