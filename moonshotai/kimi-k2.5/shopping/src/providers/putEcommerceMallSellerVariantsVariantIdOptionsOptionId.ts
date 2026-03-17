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

export async function putEcommerceMallSellerVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOption.IUpdate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Validate at least one field is provided for update
  if (
    props.body.option_name === undefined &&
    props.body.option_value === undefined
  ) {
    throw new HttpException(
      "At least one field (option_name or option_value) must be provided for update",
      400,
    );
  }
  // Fetch the option and verify it belongs to the specified variant with ownership chain
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUnique({
      where: { id: props.optionId },
      select: {
        id: true,
        product_variant_id: true,
        option_name: true,
        option_value: true,
        created_at: true,
        updated_at: true,
        productVariant: {
          select: {
            id: true,
            product_id: true,
            product: {
              select: {
                id: true,
                seller_id: true,
              },
            },
          },
        },
      },
    });
  if (option === null) {
    throw new HttpException("Option not found", 404);
  }
  // Verify option belongs to the specified variant
  if (option.product_variant_id !== props.variantId) {
    throw new HttpException(
      "Forbidden - Option does not belong to this variant",
      403,
    );
  }
  // Verify seller owns the product (cross-seller variant creation prevention)
  if (option.productVariant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - You do not own this product", 403);
  }
  // Check uniqueness constraint if option_name is being updated
  if (
    props.body.option_name !== undefined &&
    props.body.option_name !== option.option_name
  ) {
    const existingOption =
      await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
        where: {
          product_variant_id: props.variantId,
          option_name: props.body.option_name,
          id: { not: props.optionId },
        },
      });
    if (existingOption !== null) {
      throw new HttpException(
        "Conflict - An option with this name already exists for this variant",
        409,
      );
    }
  }
  // Build update data using Prisma's expected types
  const updateData: Prisma.ecommerce_mall_product_variant_optionsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.option_name !== undefined) {
    updateData.option_name = props.body.option_name;
  }
  if (props.body.option_value !== undefined) {
    updateData.option_value = props.body.option_value;
  }
  // Update the option record
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.update({
    where: { id: props.optionId },
    data: updateData,
  });
  // Fetch updated record with transformer selection and transform to response DTO
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...EcommerceMallProductVariantOptionTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantOptionTransformer.transform(updated);
}
