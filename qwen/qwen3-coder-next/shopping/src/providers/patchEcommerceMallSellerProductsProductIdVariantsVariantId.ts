import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, sku_code: true, product_id: true },
    });
  if (currentVariant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to product", 400);
  }
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== currentVariant.sku_code
  ) {
    const existing =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
        where: { sku_code: props.body.sku_code },
        select: { id: true },
      });
    if (existing !== null && existing.id !== props.variantId) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      sku_code: props.body.sku_code ?? undefined,
      price_override: props.body.price_override ?? null,
      stock_quantity: props.body.stock_quantity ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
    ...EcommerceMallProductVariantTransformer.select(),
  });
  return await EcommerceMallProductVariantTransformer.transform(updated);
}
