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
import { EcommerceMallProductVariantOptionValueCollector } from "../collectors/EcommerceMallProductVariantOptionValueCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOptionValue.ICreate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // Verify variant exists and belongs to the specified product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        product: {
          select: {
            id: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  if (
    variant === null ||
    variant.ecommerce_mall_product_id !== props.productId
  ) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify seller owns the product
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if option key already exists for this variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUnique(
      {
        where: {
          ecommerce_mall_product_variant_id_key: {
            ecommerce_mall_product_variant_id: props.variantId,
            key: props.body.key,
          },
        },
      },
    );
  if (existingOption !== null) {
    throw new HttpException("Option key already exists for this variant", 409);
  }
  // Create the option value using collector
  const created =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.create({
      data: await EcommerceMallProductVariantOptionValueCollector.collect({
        body: props.body,
        productVariant: { id: props.variantId },
      }),
      ...EcommerceMallProductVariantOptionValueTransformer.select(),
    });
  return await EcommerceMallProductVariantOptionValueTransformer.transform(
    created,
  );
}
