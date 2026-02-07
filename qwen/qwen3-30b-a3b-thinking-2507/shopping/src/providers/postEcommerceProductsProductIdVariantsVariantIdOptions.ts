import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductVariantOptionCollector } from "../collectors/EcommerceProductVariantOptionCollector";
import { EcommerceProductVariantOptionTransformer } from "../transformers/EcommerceProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceProductsProductIdVariantsVariantIdOptions(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariantOption.ICreate;
}): Promise<IEcommerceProductVariantOption> {
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: {
      id: props.variantId,
      products_id: props.productId,
    },
  });
  if (!variant) throw new HttpException("Variant not found", 404);
  const data = await EcommerceProductVariantOptionCollector.collect({
    body: props.body,
    ecommerceProductVariants: variant,
  });
  const created =
    await MyGlobal.prisma.ecommerce_product_variant_options.create({
      data: {
        ...data,
        variant: { connect: { id: variant.id } },
      },
    });
  return await EcommerceProductVariantOptionTransformer.transform(created);
}
