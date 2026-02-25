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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IUpdate;
}): Promise<IEcommerceProductVariant> {
  // 1. Verify seller owns the product
  const product = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Product not found or you don't have permission",
      404,
    );
  }
  // 2. Verify variant exists and belongs to this product
  const existingVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findFirst({
      where: {
        id: props.variantId,
        ecommerce_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!existingVariant) {
    throw new HttpException("Variant not found", 404);
  }
  // 3. Validate SKU uniqueness and length if SKU is being modified
  if (props.body.sku !== undefined) {
    if (props.body.sku.length < 3 || props.body.sku.length > 50) {
      throw new HttpException("SKU must be 3-50 characters", 400);
    }
    const existingSku =
      await MyGlobal.prisma.ecommerce_product_variants.findFirst({
        where: {
          sku: props.body.sku,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (existingSku) {
      throw new HttpException("SKU already exists", 400);
    }
  }
  // 4. Validate quantity range if quantity is being modified
  if (props.body.quantity !== undefined && props.body.quantity < 0) {
    throw new HttpException("Quantity must be non-negative", 400);
  }
  // 5. Create variant snapshot before changes (would be implemented by snapshot system)
  // In production, would call: await createVariantSnapshot(existingVariant.id, props.seller.id);
  // 6. Update variant fields with proper type handling
  const updateData = {
    ...(props.body.sku !== undefined && { sku: props.body.sku }),
    ...(props.body.option_values !== undefined && {
      option_values: props.body.option_values,
    }),
    ...(props.body.price_override !== undefined && {
      price_override: props.body.price_override,
    }),
    ...(props.body.quantity !== undefined && { quantity: props.body.quantity }),
    updated_at: new Date(),
  } satisfies Prisma.ecommerce_product_variantsUpdateInput;
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_product_variants.update({
      where: { id: props.variantId },
      data: updateData,
      ...EcommerceProductVariantTransformer.select(),
    });
  // 7. Transform and return response using transformer
  return await EcommerceProductVariantTransformer.transform(updatedVariant);
}
