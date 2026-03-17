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
  // Verify variant exists and belongs to seller's product
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      include: {
        product: {
          select: {
            id: true,
            seller_id: true,
          },
        },
      },
    });
  // Verify seller owns the product
  if (existingVariant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build update data with only provided fields
  const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.sku !== undefined) {
    updateData.sku = props.body.sku;
  }
  if (props.body.options !== undefined) {
    updateData.options = JSON.stringify(props.body.options);
  }
  if (props.body.base_price !== undefined) {
    updateData.base_price = props.body.base_price;
  }
  if (props.body.sale_price !== undefined) {
    updateData.sale_price = props.body.sale_price;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.sort_order !== undefined) {
    updateData.sort_order = props.body.sort_order;
  }
  if (props.body.is_default !== undefined) {
    updateData.is_default = props.body.is_default;
  }
  // Create snapshot before update for audit trail
  await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.create({
    data: {
      id: v4(),
      product_variant_id: props.variantId,
      product_id: existingVariant.product_id,
      options: existingVariant.options,
      sku_code: existingVariant.sku,
      price: Number(existingVariant.base_price),
      stock_quantity: existingVariant.stock_quantity,
      status: existingVariant.status,
      created_at: new Date(),
    },
  });
  // Update variant
  const updated = await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: updateData,
    select: {
      id: true,
      sku: true,
      options: true,
      base_price: true,
      sale_price: true,
      stock_quantity: true,
      reserved_quantity: true,
      status: true,
      sort_order: true,
      is_default: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      product: EcommerceMallProductAtSummaryTransformer.select(),
    },
  });
  return EcommerceMallProductVariantTransformer.transform({
    ...updated,
    variantSnapshots: [],
    variantOptions: [],
    inventoryRecords: [],
  });
}
