import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product exists, is active, and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
  // Check SKU uniqueness within the product
  const existingVariantWithSameSku =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        product_id: props.productId,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });
  if (existingVariantWithSameSku !== null) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  // Check option values uniqueness within the product
  const existingVariantWithSameOptions =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        product_id: props.productId,
        option_values: JSON.stringify(props.body.option_values),
        deleted_at: null,
      },
    });
  if (existingVariantWithSameOptions !== null) {
    throw new HttpException(
      "Option values combination already exists for this product",
      409,
    );
  }
  // Create variant using collector
  const created = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data: await EcommerceMallProductVariantCollector.collect({
      body: props.body,
      ecommerceMallProducts: { id: props.productId },
    }),
    ...EcommerceMallProductVariantTransformer.select(),
  });
  return await EcommerceMallProductVariantTransformer.transform(created);
}
