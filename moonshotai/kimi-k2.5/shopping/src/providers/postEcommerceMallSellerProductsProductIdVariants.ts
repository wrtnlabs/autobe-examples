import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Check SKU uniqueness within product (excluding soft-deleted variants)
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        product_id: props.productId,
        sku_code: props.body.skuCode,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  // Collect data using collector
  const createInput = await EcommerceMallProductVariantCollector.collect({
    body: props.body,
    ecommerceMallProducts: { id: props.productId },
    ecommerceMallSellers: { id: props.seller.id },
    ecommerceMallSellerSessions: { id: props.seller.session_id },
  });
  // Create variant with nested options
  const created = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data: createInput,
    ...EcommerceMallProductVariantTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallProductVariantTransformer.transform(created);
}
