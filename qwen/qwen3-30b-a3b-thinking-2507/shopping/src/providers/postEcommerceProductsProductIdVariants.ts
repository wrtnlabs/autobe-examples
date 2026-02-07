import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductVariantCollector } from "../collectors/EcommerceProductVariantCollector";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.ICreate;
}): Promise<IEcommerceProductVariant> {
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  const existingVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findFirst({
      where: { sku: props.body.sku },
    });
  if (existingVariant) {
    throw new HttpException("SKU must be unique", 400);
  }
  const created = await MyGlobal.prisma.ecommerce_product_variants.create({
    data: await EcommerceProductVariantCollector.collect({
      body: props.body,
      ecommerceProducts: { id: props.productId },
    }),
    ...EcommerceProductVariantTransformer.select(),
  });
  return await EcommerceProductVariantTransformer.transform(created);
}
