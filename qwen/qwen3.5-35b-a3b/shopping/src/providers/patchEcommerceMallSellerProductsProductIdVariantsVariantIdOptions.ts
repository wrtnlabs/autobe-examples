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
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdateOption;
}): Promise<IEcommerceMallProductVariant.ISummary> {
  // 1. Verify variant exists, belongs to product, and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      include: {
        product: {
          select: { seller_id: true, deleted_at: true },
        },
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify product is not deleted and seller owns it
  if (variant.product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate operations array
  if (!props.body.operations || props.body.operations.length === 0) {
    throw new HttpException(
      "Operations array is required and must be non-empty",
      400,
    );
  }
  // Check for duplicate keys within request and validate add operations
  const existingKeys = new Set<string>();
  for (const op of props.body.operations) {
    if (existingKeys.has(op.key)) {
      throw new HttpException(`Duplicate option key found: ${op.key}`, 400);
    }
    existingKeys.add(op.key);
    // For add operations, verify key doesn't already exist on variant
    if (op.action === "add") {
      const existingOption =
        await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
          where: {
            product_variant_id: props.variantId,
            key: op.key,
            deleted_at: null,
          },
        });
      if (existingOption) {
        throw new HttpException(`Option key already exists: ${op.key}`, 409);
      }
    }
  }
  // 3. Execute batch operations in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    const operations = props.body.operations;
    // Add operations
    for (const op of operations) {
      if (op.action === "add") {
        await tx.ecommerce_mall_product_variant_options.create({
          data: {
            id: v4(),
            product_variant_id: props.variantId,
            key: op.key,
            value: op.value,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
    // Update operations
    for (const op of operations) {
      if (op.action === "update") {
        await tx.ecommerce_mall_product_variant_options.updateMany({
          where: {
            product_variant_id: props.variantId,
            key: op.key,
            deleted_at: null,
          },
          data: {
            value: op.value,
            updated_at: new Date(),
          },
        });
      }
    }
    // Remove operations (soft delete)
    for (const op of operations) {
      if (op.action === "remove") {
        await tx.ecommerce_mall_product_variant_options.updateMany({
          where: {
            product_variant_id: props.variantId,
            key: op.key,
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
          },
        });
      }
    }
    // 4. Create snapshot after successful operations
    const variantSnapshotData =
      await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
        where: { id: props.variantId },
        select: {
          id: true,
          product_id: true,
          sku: true,
          options: true,
          base_price: true,
          stock_quantity: true,
          status: true,
          created_at: true,
        },
      });
    await tx.ecommerce_mall_product_variant_snapshots.create({
      data: {
        id: v4(),
        product_variant_id: props.variantId,
        product_id: variantSnapshotData.product_id,
        sku_code: variantSnapshotData.sku,
        options: variantSnapshotData.options,
        price: variantSnapshotData.base_price,
        stock_quantity: variantSnapshotData.stock_quantity,
        status: variantSnapshotData.status,
        created_at: new Date(),
      },
    });
  });
  // 5. Fetch updated variant with product reference for transformation
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  return await EcommerceMallProductVariantAtSummaryTransformer.transform(
    updatedVariant,
  );
}
