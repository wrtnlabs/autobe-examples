import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { EcommerceMallProductVariantOptionValueTransformer } from "../transformers/EcommerceMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdOptionValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantOptionValue.IUpdate;
}): Promise<IEcommerceMallProductVariantOptionValue> {
  // Edge case: Empty request body - at least one option must be provided
  if (props.body.key === undefined && props.body.value === undefined) {
    throw new HttpException("At least one option must be provided", 400);
  }
  // 1. Ownership Validation - verify seller owns the product with category
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 403);
  }
  // 2. Variant Verification - verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Generate UUIDs for snapshot records
  const snapshotId = v4();
  const snapshotVariantId = v4();
  const now = new Date();
  // 3. Create snapshot before modification
  // Get current option values for snapshot
  const currentOptions =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findMany(
      {
        where: {
          ecommerce_mall_product_variant_id: props.variantId,
        },
        select: {
          id: true,
          key: true,
          value: true,
        },
      },
    );
  // Create product snapshot
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_product_id: props.productId,
      ecommerce_mall_seller_id: props.seller.id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category_name: product.category.name,
      created_at: now,
    },
  });
  // Create snapshot variant
  await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.create({
    data: {
      id: snapshotVariantId,
      ecommerce_mall_product_snapshot_id: snapshotId,
      sku: variant.sku_code,
      price_override: variant.price,
      stock_quantity: variant.quantity,
      created_at: now,
    },
  });
  // Create snapshot option values
  for (const opt of currentOptions) {
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variant_option_values.create(
      {
        data: {
          id: v4(),
          ecommerce_mall_product_snapshot_variant_id: snapshotVariantId,
          key: opt.key,
          value: opt.value,
          created_at: now,
        },
      },
    );
  }
  // 4. Update option values based on request body
  if (props.body.key !== undefined) {
    const key = props.body.key;
    const value = props.body.value;
    if (value === null) {
      // DELETE the option if value is null
      await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.deleteMany(
        {
          where: {
            ecommerce_mall_product_variant_id: props.variantId,
            key: key,
          },
        },
      );
    } else {
      // UPSERT the option - update if exists, insert if not
      const existingOption =
        await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirst(
          {
            where: {
              ecommerce_mall_product_variant_id: props.variantId,
              key: key,
            },
            select: {
              id: true,
            },
          },
        );
      if (existingOption !== null) {
        // UPDATE existing option
        await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.update(
          {
            where: {
              ecommerce_mall_product_variant_id_key: {
                ecommerce_mall_product_variant_id: props.variantId,
                key: key,
              },
            },
            data: {
              value: value,
              updated_at: now,
            },
          },
        );
      } else {
        // INSERT new option
        await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.create(
          {
            data: {
              id: v4(),
              ecommerce_mall_product_variant_id: props.variantId,
              key: key,
              value: value!,
              created_at: now,
              updated_at: now,
            },
          },
        );
      }
    }
  }
  // 5. Return the updated option value via transformer
  const transformerSelect =
    EcommerceMallProductVariantOptionValueTransformer.select();
  const result =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirst(
      {
        where: {
          ecommerce_mall_product_variant_id: props.variantId,
          key: props.body.key,
        },
        select: transformerSelect.select,
      },
    );
  if (result === null) {
    throw new HttpException("Option value not found after update", 404);
  }
  return await EcommerceMallProductVariantOptionValueTransformer.transform(
    result,
  );
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdOptionValues(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariantOptionValue.IUpdate;
// }): Promise<IEcommerceMallProductVariantOptionValue> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findFirstOrThrow({
//     ...EcommerceMallProductVariantOptionValueTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantOptionValueTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------