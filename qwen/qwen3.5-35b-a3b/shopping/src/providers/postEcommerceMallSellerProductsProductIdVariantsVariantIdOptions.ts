import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOption.ICreate;
}): Promise<IEcommerceMallProductVariantOption> {
  // 1. Validate product exists and is owned by seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 2. Validate variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 3. Check option key uniqueness for this variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUnique({
      where: {
        product_variant_id_key: {
          product_variant_id: props.variantId,
          key: props.body.key,
        },
      },
    });
  if (existingOption !== null) {
    throw new HttpException("Option key already exists for this variant", 409);
  }
  // 4. Create the option using collector
  const created =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.create({
      data: await EcommerceMallProductVariantOptionCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: { id: props.variantId },
      }),
      ...EcommerceMallProductVariantOptionTransformer.select(),
    });
  // 5. Transform and return
  return await EcommerceMallProductVariantOptionTransformer.transform(created);
}
