import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantCollector } from "../collectors/EcommerceMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreate;
}): Promise<IEcommerceMallProductVariant> {
  // 1. Validate product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate SKU is unique
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { sku: props.body.sku },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU already exists", 409);
  }
  // 3-4. Create variant using collector
  const created = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data: await EcommerceMallProductVariantCollector.collect({
      body: props.body,
      ecommerceMallProducts: { id: product.id },
    }),
    ...EcommerceMallProductVariantTransformer.select(),
  });
  // 5-6. Transform and return
  return await EcommerceMallProductVariantTransformer.transform(created);
}
