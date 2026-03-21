import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantCollector } from "../collectors/EcommerceMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreate;
}): Promise<IEcommerceMallProductVariant> {
  // 1. Verify product exists and belongs to the authenticated seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Check SKU uniqueness (including deleted variants since unique constraint applies globally)
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: { sku_code: props.body.sku_code },
      select: { id: true },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU code is already in use", 400);
  }
  // 3. Create variant using Collector for data transformation
  const variantData = await EcommerceMallProductVariantCollector.collect({
    body: props.body,
    ecommerceMallProducts: { id: props.productId },
    ecommerceMallSellers: { id: props.seller.id },
    ecommerceMallSellerSessions: { id: props.seller.session_id },
  });
  // 4. Insert variant into database with transformer for response selection
  const created = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data: variantData,
    ...EcommerceMallProductVariantTransformer.select(),
  });
  // 5. Transform and return the created variant
  return await EcommerceMallProductVariantTransformer.transform(created);
}
