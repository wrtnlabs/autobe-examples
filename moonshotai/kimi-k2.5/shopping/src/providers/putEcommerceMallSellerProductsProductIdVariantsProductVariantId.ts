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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsProductVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productVariantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify variant exists and belongs to this product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.productVariantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        variantOptions: {
          select: {
            option_name: true,
            option_value: true,
          },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Check SKU uniqueness if being changed
  if (
    props.body.skuCode !== undefined &&
    props.body.skuCode !== variant.sku_code
  ) {
    const existingSku =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          deleted_at: null,
          id: {
            not: props.productVariantId,
          },
        },
        select: {
          id: true,
        },
      });
    if (existingSku !== null) {
      throw new HttpException("SKU code already in use", 409);
    }
  }
  // Perform snapshot creation and update in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot of current state
    const snapshotId = v4();
    const now = new Date();
    await tx.ecommerce_mall_product_variant_snapshots.create({
      data: {
        id: snapshotId,
        product_variant_id: props.productVariantId,
        sku_code: variant.sku_code,
        price: variant.price ?? 0,
        created_at: now,
      },
    });
    // Copy current options to snapshot
    if (variant.variantOptions.length > 0) {
      await tx.ecommerce_mall_product_variant_snapshot_option_values.createMany(
        {
          data: variant.variantOptions.map((opt) => ({
            id: v4(),
            ecommerce_mall_product_variant_snapshot_id: snapshotId,
            option_name: opt.option_name,
            option_value: opt.option_value,
            created_at: now,
          })),
        },
      );
    }
    // Update variant with new values
    const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {
      updated_at: now,
    };
    if (props.body.skuCode !== undefined) {
      updateData.sku_code = props.body.skuCode;
    }
    if (props.body.price !== undefined) {
      updateData.price = props.body.price;
    }
    await tx.ecommerce_mall_product_variants.update({
      where: {
        id: props.productVariantId,
      },
      data: updateData,
    });
    // Replace options if provided
    if (props.body.options !== undefined) {
      // Delete existing options
      await tx.ecommerce_mall_product_variant_options.deleteMany({
        where: {
          product_variant_id: props.productVariantId,
        },
      });
      // Insert new options
      if (props.body.options.length > 0) {
        await tx.ecommerce_mall_product_variant_options.createMany({
          data: props.body.options.map((opt) => ({
            id: v4(),
            product_variant_id: props.productVariantId,
            option_name: opt.optionName,
            option_value: opt.optionValue,
            created_at: now,
            updated_at: now,
          })),
        });
      }
    }
  });
  // Fetch and return updated variant
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.productVariantId,
      },
      ...EcommerceMallProductVariantTransformer.select(),
    });
  return await EcommerceMallProductVariantTransformer.transform(updated);
}
