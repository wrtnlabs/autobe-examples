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
  // Step 1: Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, product_id: true },
    });
  if (variant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to product", 400);
  }
  // Step 3: Verify option exists and belongs to the variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          productVariant: { select: { id: true } },
          key: true,
        },
      },
    );
  if (existingOption.productVariant.id !== props.variantId) {
    throw new HttpException("Option does not belong to variant", 400);
  }
  // Step 4: Validate at least one of key or value is provided
  if (props.body.key === undefined && props.body.value === undefined) {
    throw new HttpException(
      "At least one of 'key' or 'value' must be provided",
      400,
    );
  }
  // Step 5: If key is being changed, validate no conflict with existing options for same variant
  if (props.body.key !== undefined && props.body.key !== existingOption.key) {
    const duplicate =
      await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
        where: {
          product_variant_id: props.variantId,
          key: props.body.key,
          deleted_at: null,
          id: {
            not: props.optionId,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_optionsWhereInput,
      });
    if (duplicate !== null) {
      throw new HttpException(
        "Option key already exists for this variant",
        409,
      );
    }
  }
  // Step 6: Update the option record
  const updateData = {
    ...(props.body.key !== undefined && { key: props.body.key }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    updated_at: new Date(),
  } satisfies Prisma.ecommerce_mall_product_variant_optionsUpdateInput;
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.update({
    where: { id: props.optionId },
    data: updateData,
  });
  // Step 7: Return updated option with full data via transformer
  const fullOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...EcommerceMallProductVariantOptionTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantOptionTransformer.transform(
    fullOption,
  );
}
