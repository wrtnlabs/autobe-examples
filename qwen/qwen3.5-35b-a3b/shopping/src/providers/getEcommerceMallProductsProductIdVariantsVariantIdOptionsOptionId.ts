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
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantOption> {
  // Step 1: Validate product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId, deleted_at: null },
  });
  // Step 2: Validate variant exists and belongs to the product
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  // Step 3: Retrieve the option with product variant reference
  // Include product variant reference to validate the three-level hierarchy
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          product_variant_id: props.variantId,
          deleted_at: null,
        },
        select: {
          id: true,
          key: true,
          value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          productVariant:
            EcommerceMallProductVariantAtSummaryTransformer.select(),
        },
      },
    );
  // Step 4: Transform and return the option
  return await EcommerceMallProductVariantOptionTransformer.transform(option);
}
