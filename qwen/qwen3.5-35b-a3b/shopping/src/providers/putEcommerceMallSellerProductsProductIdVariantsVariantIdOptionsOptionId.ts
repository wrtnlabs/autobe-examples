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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOption.IUpdate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Step 1: Verify seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId, product_id: props.productId },
      select: { id: true, product_id: true, deleted_at: true },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 3: Verify option exists and belongs to variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          product_variant_id: true,
          key: true,
          value: true,
          deleted_at: true,
        },
      },
    );
  if (existingOption.deleted_at !== null) {
    throw new HttpException("Option not found", 404);
  }
  if (existingOption.product_variant_id !== props.variantId) {
    throw new HttpException("Option not found", 404);
  }
  // Step 4: Validate at least one of key or value is provided
  if (props.body.key === undefined && props.body.value === undefined) {
    throw new HttpException(
      "At least one of 'key' or 'value' must be provided",
      400,
    );
  }
  // Step 5: Check key uniqueness if key is being changed
  if (props.body.key !== undefined && props.body.key !== existingOption.key) {
    const duplicateOption =
      await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
        where: {
          product_variant_id: props.variantId,
          key: props.body.key,
          deleted_at: null,
          id: { not: props.optionId },
        },
        select: { id: true },
      });
    if (duplicateOption !== null) {
      throw new HttpException(
        "Option key must be unique within a variant",
        409,
      );
    }
  }
  // Step 6: Update option
  const updatedOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.update({
      where: { id: props.optionId },
      data: {
        key: props.body.key ?? existingOption.key,
        value: props.body.value ?? existingOption.value,
        updated_at: toISOStringSafe(new Date()),
      },
      ...EcommerceMallProductVariantOptionTransformer.select(),
    });
  // Step 7: Transform and return
  return await EcommerceMallProductVariantOptionTransformer.transform(
    updatedOption,
  );
}
