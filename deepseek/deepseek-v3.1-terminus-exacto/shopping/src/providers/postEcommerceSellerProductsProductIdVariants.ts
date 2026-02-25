import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
  // Verify the product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Check SKU uniqueness across platform
  const existingVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findFirst({
      where: {
        sku: props.body.sku,
        deleted_at: null,
      },
    });
  if (existingVariant) {
    throw new HttpException("SKU already exists in the platform", 400);
  }
  // Validate product ownership is correct
  if (product.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Access denied", 403);
  }
  // Create product variant
  const created = await MyGlobal.prisma.ecommerce_product_variants.create({
    data: await EcommerceProductVariantCollector.collect({
      body: props.body,
      product: { id: product.id },
    }),
    ...EcommerceProductVariantTransformer.select(),
  });
  return await EcommerceProductVariantTransformer.transform(created);
}
