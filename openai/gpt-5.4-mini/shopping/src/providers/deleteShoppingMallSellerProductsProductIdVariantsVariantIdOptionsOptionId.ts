import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const buildCombination = (
    entries: Array<{
      option_name: string;
      option_value: string;
    }>,
  ): string =>
    entries
      .slice()
      .sort((left, right) => {
        const leftKey = `${left.option_name}:${left.option_value}`;
        const rightKey = `${right.option_name}:${right.option_value}`;
        return leftKey.localeCompare(rightKey);
      })
      .map((entry) => `${entry.option_name}:${entry.option_value}`)
      .join("|");
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const product = await prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
    if (product.shopping_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (product.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const variant =
      await prisma.shopping_mall_product_variants.findUniqueOrThrow({
        where: { id: props.variantId },
        select: {
          id: true,
          shopping_mall_product_id: true,
          deleted_at: true,
        },
      });
    if (variant.shopping_mall_product_id !== product.id) {
      throw new HttpException("Not Found", 404);
    }
    if (variant.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const option =
      await prisma.shopping_mall_product_variant_options.findUniqueOrThrow({
        where: { id: props.optionId },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
          option_name: true,
          option_value: true,
          deleted_at: true,
        },
      });
    if (option.shopping_mall_product_variant_id !== variant.id) {
      throw new HttpException("Not Found", 404);
    }
    if (option.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const variantOptions =
      await prisma.shopping_mall_product_variant_options.findMany({
        where: {
          shopping_mall_product_variant_id: variant.id,
          deleted_at: null,
        },
        select: {
          id: true,
          option_name: true,
          option_value: true,
        },
      });
    const remainingOptions = variantOptions.filter(
      (entry) => entry.id !== option.id,
    );
    if (remainingOptions.length === 0) {
      throw new HttpException(
        "Removing the option would invalidate the variant",
        400,
      );
    }
    const remainingCombination = buildCombination(remainingOptions);
    const siblingVariants =
      await prisma.shopping_mall_product_variants.findMany({
        where: {
          shopping_mall_product_id: product.id,
          deleted_at: null,
          id: { not: variant.id },
        },
        select: {
          id: true,
          options: {
            where: { deleted_at: null },
            select: {
              option_name: true,
              option_value: true,
            },
          },
        },
      });
    const duplicated = siblingVariants.some(
      (sibling) => buildCombination(sibling.options) === remainingCombination,
    );
    if (duplicated) {
      throw new HttpException(
        "Removing the option would duplicate another variant",
        400,
      );
    }
    await prisma.shopping_mall_product_variant_options.delete({
      where: { id: option.id },
    });
  });
}
