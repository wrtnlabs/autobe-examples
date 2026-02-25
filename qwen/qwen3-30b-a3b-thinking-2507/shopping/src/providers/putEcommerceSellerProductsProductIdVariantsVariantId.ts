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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IEcommerceProductVariant.IUpdate;
}): Promise<IEcommerceProductVariant> {
  const variant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        product: {
          select: {
            id: true,
          },
        },
      },
    });
  if (variant.product.id !== props.productId) {
    throw new HttpException("Product ID mismatch", 400);
  }
  if (props.body.sku_code !== undefined) {
    const existing = await MyGlobal.prisma.ecommerce_product_variants.findFirst(
      {
        where: {
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
        },
      },
    );
    if (existing) {
      throw new HttpException("SKU code already exists", 400);
    }
  }
  if (props.body.price !== undefined && props.body.price !== null) {
    if (props.body.price <= 0) {
      throw new HttpException("Price must be positive", 400);
    }
  }
  const updatedData = {
    ...(props.body.sku_code !== undefined && {
      sku_code: props.body.sku_code,
    }),
    ...(props.body.price !== undefined && { price: props.body.price }),
    updated_at: toISOStringSafe(new Date()),
  };
  await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: updatedData,
  });
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...EcommerceProductVariantTransformer.select(),
    });
  return await EcommerceProductVariantTransformer.transform(updatedVariant);
}
