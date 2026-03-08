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
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  // 1. Verify variant exists and belongs to specified product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        sku_code: true,
        deleted_at: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant has been deleted", 404);
  }
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // 2. Verify seller owns the product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if variant has active order items (cannot modify if has active orders)
  const hasActiveOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
    });
  if (hasActiveOrderItems !== null) {
    throw new HttpException(
      "Cannot modify variant with active order items",
      400,
    );
  }
  // 4. Validate SKU code uniqueness if changed
  if (
    props.body.skuCode !== undefined &&
    props.body.skuCode !== variant.sku_code
  ) {
    const existingVariant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (existingVariant !== null) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  // 5. Validate optionValues if provided
  if (props.body.optionValues !== undefined) {
    const optionValues = props.body.optionValues;
    const keys = Object.keys(optionValues);
    if (keys.length === 0) {
      throw new HttpException("Option values cannot be empty", 400);
    }
    for (const key of keys) {
      const value = optionValues[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new HttpException("Option values must be non-empty strings", 400);
      }
    }
  }
  // 6. Validate price if provided
  if (props.body.price !== undefined && props.body.price !== null) {
    if (props.body.price < 0) {
      throw new HttpException("Price cannot be negative", 400);
    }
  }
  // 7. Fetch current state for snapshot
  const currentVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      include: {
        variantOptions: {
          select: {
            key: true,
            value: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
      },
    });
  if (currentVariant === null) {
    throw new HttpException("Variant not found", 404);
  }
  const previousValues = {
    sku_code: currentVariant.sku_code,
    price: currentVariant.price,
    optionValues: Object.fromEntries(
      currentVariant.variantOptions.map((opt) => [opt.key, opt.value]),
    ),
  };
  // 8. Update variant fields
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        ...(props.body.skuCode !== undefined && {
          sku_code: props.body.skuCode,
        }),
        ...(props.body.price !== undefined && { price: props.body.price }),
        updated_at: new Date(),
      },
    });
  // 9. Update option values: delete existing, insert new
  if (props.body.optionValues !== undefined) {
    // Delete existing option rows
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.deleteMany({
      where: { ecommerce_mall_product_variant_id: props.variantId },
    });
    // Insert new option rows
    const optionData = Object.entries(props.body.optionValues).map(
      ([key, value]) => ({
        id: typia.random<string & tags.Format<"uuid">>(),
        ecommerce_mall_product_variant_id: props.variantId,
        key,
        value,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      }),
    );
    if (optionData.length > 0) {
      await MyGlobal.prisma.ecommerce_mall_product_variant_options.createMany({
        data: optionData,
      });
    }
  }
  // 10. Create product snapshot
  const currentValues = {
    sku_code: updatedVariant.sku_code,
    price: updatedVariant.price,
    optionValues:
      props.body.optionValues !== undefined
        ? props.body.optionValues
        : previousValues.optionValues,
  };
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: typia.random<string & tags.Format<"uuid">>(),
      ecommerce_mall_products_id: props.productId,
      ecommerce_mall_sellers_id: props.seller.id,
      previous_values: JSON.stringify(previousValues),
      current_values: JSON.stringify(currentValues),
      created_at: new Date(),
    },
  });
  // 11. Fetch and return updated variant
  const finalVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      ...EcommerceMallProductVariantTransformer.select(),
    });
  if (finalVariant === null) {
    throw new HttpException("Variant not found", 404);
  }
  return await EcommerceMallProductVariantTransformer.transform(finalVariant);
}
