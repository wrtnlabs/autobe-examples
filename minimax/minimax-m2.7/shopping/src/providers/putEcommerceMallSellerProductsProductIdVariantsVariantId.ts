import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
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
  // 1. Retrieve and verify variant exists and is not soft-deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
        ecommerce_mall_product_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (variant === null || variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // 2. Retrieve and verify product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      name: true,
      description: true,
      base_price: true,
      deleted_at: true,
      category: {
        select: { name: true },
      } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 3. Verify the product's seller matches the authenticated seller
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify the variant belongs to the product
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 400);
  }
  // 5. Retrieve existing option values for snapshot before any updates
  const existingOptionValues =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findMany(
      {
        where: { ecommerce_mall_product_variant_id: props.variantId },
        select: { key: true, value: true },
      },
    );
  // 6. Execute database transaction for atomicity
  const updatedVariant = await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshotId = v4() as string & tags.Format<"uuid">;
    const now = new Date();
    // 6a. Create snapshot of current state before update
    await tx.ecommerce_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_mall_product_id: props.productId,
        ecommerce_mall_seller_id: props.seller.id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: product.category.name,
        created_at: now,
        productSnapshotVariants: {
          create: {
            id: v4() as string & tags.Format<"uuid">,
            sku: variant.sku_code,
            price_override: variant.price ?? null,
            stock_quantity: variant.quantity,
            created_at: now,
          },
        },
      },
    });
    // 6b. Handle option values update if provided
    if (
      props.body.optionValues !== undefined &&
      props.body.optionValues.length > 0
    ) {
      // Delete existing option values
      await tx.ecommerce_mall_product_variant_option_values.deleteMany({
        where: { ecommerce_mall_product_variant_id: props.variantId },
      });
      // Create new option values using the existing keys from the original option values
      // Note: The IUpdate type provides values; we need to pair them with existing keys
      // This assumes the same number of option values are being updated
      const updateValues = props.body.optionValues.map((opt, index) => ({
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_product_variant_id: props.variantId,
        key: existingOptionValues[index]?.key ?? `option_${index + 1}`,
        value: opt.value,
        created_at: now,
        updated_at: now,
      }));
      await tx.ecommerce_mall_product_variant_option_values.createMany({
        data: updateValues,
      });
    }
    // 6c. Update variant record
    const updated = await tx.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        updated_at: now,
      },
      ...EcommerceMallProductVariantTransformer.select(),
    });
    return updated;
  });
  // 7. Transform and return the updated variant
  return await EcommerceMallProductVariantTransformer.transform(updatedVariant);
}
