import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductVariantOptionTransformer } from "../transformers/EcommerceProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  productId: string;
  variantId: string;
  optionId: string;
}): Promise<IEcommerceProductVariantOption> {
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: { id: props.variantId, ecommerceProductId: props.productId },
  });
  if (!variant) throw new HttpException("Variant not found", 404);
  const option =
    await MyGlobal.prisma.ecommerce_product_variant_options.findUnique({
      where: {
        id: props.optionId,
        ecommerce_product_variant_id: props.variantId,
      },
      ...EcommerceProductVariantOptionTransformer.select(),
    });
  if (!option) throw new HttpException("Option not found", 404);
  return await EcommerceProductVariantOptionTransformer.transform(option);
}
