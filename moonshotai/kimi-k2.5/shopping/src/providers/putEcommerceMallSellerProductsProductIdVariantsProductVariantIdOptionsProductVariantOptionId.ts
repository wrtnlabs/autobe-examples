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

export async function putEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productVariantId: string & tags.Format<"uuid">;
  productVariantOptionId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOption.IUpdate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Step 1: Verify seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId },
      select: { id: true, product_id: true },
    });
  if (variant.product_id !== props.productId) {
    throw new HttpException("Variant does not belong to product", 400);
  }
  // Step 3: Verify option belongs to variant
  const existingOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.productVariantOptionId },
        select: {
          id: true,
          product_variant_id: true,
          option_name: true,
          option_value: true,
        },
      },
    );
  if (existingOption.product_variant_id !== props.productVariantId) {
    throw new HttpException("Option does not belong to variant", 400);
  }
  // Step 4: Check uniqueness constraint if updating name or value
  const newOptionName = props.body.optionName ?? existingOption.option_name;
  const newOptionValue = props.body.optionValue ?? existingOption.option_value;
  // Only check if we're actually changing the combination
  if (
    (props.body.optionName !== undefined ||
      props.body.optionValue !== undefined) &&
    (newOptionName !== existingOption.option_name ||
      newOptionValue !== existingOption.option_value)
  ) {
    const duplicateOption =
      await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
        where: {
          product_variant_id: props.productVariantId,
          option_name: newOptionName,
          option_value: newOptionValue,
          id: { not: props.productVariantOptionId },
        },
      });
    if (duplicateOption !== null) {
      throw new HttpException(
        "Option with same name and value already exists for this variant",
        409,
      );
    }
  }
  // Step 5: Update the option
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.update({
    where: { id: props.productVariantOptionId },
    data: {
      ...(props.body.optionName !== undefined && {
        option_name: props.body.optionName,
      }),
      ...(props.body.optionValue !== undefined && {
        option_value: props.body.optionValue,
      }),
      updated_at: new Date(),
    },
  });
  // Step 6: Fetch and return updated option
  const updatedOption =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.productVariantOptionId },
        ...EcommerceMallProductVariantOptionTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantOptionTransformer.transform(
    updatedOption,
  );
}
