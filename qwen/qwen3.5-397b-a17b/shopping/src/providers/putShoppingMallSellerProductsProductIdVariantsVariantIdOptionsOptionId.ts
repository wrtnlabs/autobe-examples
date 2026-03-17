import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantOptionTransformer } from "../transformers/ShoppingMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOption.IUpdate;
}): Promise<IShoppingMallProductVariantOption> {
  // Verify seller owns the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_seller_id: true },
    });
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify variant belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // Verify option belongs to the variant
  const existingOption =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: { id: true, shopping_mall_product_variant_id: true, key: true },
      },
    );
  if (existingOption.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException(
      "Option does not belong to the specified variant",
      400,
    );
  }
  // If key is being changed, validate no conflict with existing options
  if (props.body.key !== undefined && props.body.key !== existingOption.key) {
    const conflict =
      await MyGlobal.prisma.shopping_mall_product_variant_options.findFirst({
        where: {
          shopping_mall_product_variant_id: props.variantId,
          key: props.body.key,
          id: { not: props.optionId },
        },
      });
    if (conflict) {
      throw new HttpException(
        "Option key must be unique within a variant",
        409,
      );
    }
  }
  // Update the option record
  await MyGlobal.prisma.shopping_mall_product_variant_options.update({
    where: { id: props.optionId },
    data: {
      ...(props.body.key !== undefined && { key: props.body.key }),
      ...(props.body.value !== undefined && { value: props.body.value }),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated option using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...ShoppingMallProductVariantOptionTransformer.select(),
      },
    );
  return await ShoppingMallProductVariantOptionTransformer.transform(updated);
}
