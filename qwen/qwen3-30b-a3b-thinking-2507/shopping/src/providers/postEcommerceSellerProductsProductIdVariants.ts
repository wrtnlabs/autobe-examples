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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
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
    await MyGlobal.prisma.ecommerce_product_variants.findUnique({
      where: {
        sku_code: props.body.sku_code,
        ecommerce_product_id: props.productId,
      },
    });
  if (existingVariant) {
    throw new HttpException("SKU already exists for this product", 400);
  }
  const created = await MyGlobal.prisma.ecommerce_product_variants.create({
    data: {
      ...(await EcommerceProductVariantCollector.collect({
        body: props.body,
        ecommerceProducts: { id: props.productId },
      })),
      snapshots: { create: [] },
      orderItems: { create: [] },
      cartItems: { create: [] },
      inventories: { create: [] },
      options: { create: [] },
    },
  });
  return await EcommerceProductVariantTransformer.transform(created);
}
