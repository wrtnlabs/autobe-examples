import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionCollector } from "../collectors/EcommerceMallProductVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productVariantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOption.ICreate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Validate product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.productVariantId },
      select: { id: true, product_id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to product", 400);
  }
  // Create option using Collector
  const optionData = await EcommerceMallProductVariantOptionCollector.collect({
    body: props.body,
    ecommerceMallProductVariants: { id: props.productVariantId },
    ecommerceMallSellers: { id: props.seller.id },
    ecommerceMallSellerSessions: { id: props.seller.session_id },
  });
  const created =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.create({
      data: optionData,
      ...EcommerceMallProductVariantOptionTransformer.select(),
    });
  return EcommerceMallProductVariantOptionTransformer.transform(created);
}
