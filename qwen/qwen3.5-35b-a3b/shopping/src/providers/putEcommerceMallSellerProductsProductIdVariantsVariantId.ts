import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify variant belongs to product
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      product_id: props.productId,
    },
  });
  // Build update data - only include fields that are provided
  const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {};
  if (props.body.sku_code !== undefined)
    updateData.sku_code = props.body.sku_code;
  if (props.body.option_values !== undefined)
    updateData.option_values = props.body.option_values;
  if (props.body.price_override !== undefined)
    updateData.price_override = props.body.price_override;
  if (props.body.stock_quantity !== undefined)
    updateData.stock_quantity = props.body.stock_quantity;
  if (props.body.is_active !== undefined)
    updateData.is_active = props.body.is_active;
  updateData.updated_at = new Date();
  // Update variant with full selection for transformation
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: updateData,
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        stock_quantity: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
      },
    });
  // Transform and return
  return await EcommerceMallProductVariantTransformer.transform(updatedVariant);
}
