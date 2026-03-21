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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantIdOptionsOptionKey(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionKey: string;
  body: IEcommerceMallProductVariantOptionValue.IUpdate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // Verify variant exists, belongs to product, and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        deleted_at: true,
      },
    });
  // Verify variant belongs to the correct product
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found for this product", 404);
  }
  // Verify variant is not deleted
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify the seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        deleted_at: true,
      },
    });
  // Verify product is not deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Verify seller owns the product
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the option by variantId AND key using unique constraint
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUnique(
      {
        where: {
          ecommerce_mall_product_variant_id_key: {
            ecommerce_mall_product_variant_id: props.variantId,
            key: props.optionKey,
          },
        },
      },
    );
  if (option === null) {
    throw new HttpException("Option not found for this variant", 404);
  }
  // Update the option value and timestamp
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.update({
      where: { id: option.id },
      data: {
        value: props.body.value,
        updated_at: new Date(),
      },
      ...EcommerceMallProductVariantOptionValueTransformer.select(),
    });
  return await EcommerceMallProductVariantOptionValueTransformer.transform(
    updated,
  );
}
