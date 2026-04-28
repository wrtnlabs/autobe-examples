import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductVariantTransformer } from "../transformers/EcommercePlatformProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductVariant.IUpdate;
}): Promise<IEcommercePlatformProductVariant> {
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: { id: props.variantId, deleted_at: null },
        select: {
          id: true,
          ecommerce_platform_product_id: true,
          product: {
            select: {
              ecommerce_platform_seller_profile_id: true,
            },
          },
        },
      },
    );
  if (variant.ecommerce_platform_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 404);
  }
  if (
    variant.product.ecommerce_platform_seller_profile_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.sku_code !== undefined) {
    const conflicting =
      await MyGlobal.prisma.ecommerce_platform_product_variants.findFirst({
        where: {
          ecommerce_platform_product_id: props.productId,
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (conflicting !== null) {
      throw new HttpException("SKU code already exists for this product", 409);
    }
  }
  const currentVariant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: { id: props.variantId },
        select: {
          sku_code: true,
          price: true,
          options: {
            where: { deleted_at: null },
            select: {
              attribute_key: true,
              attribute_value: true,
            },
          },
          inventoryRecords: {
            select: { quantity_delta: true },
          } satisfies Prisma.ecommerce_platform_inventory_recordsFindManyArgs,
        },
      },
    );
  const stockQuantity = currentVariant.inventoryRecords.reduce(
    (sum, r) => sum + r.quantity_delta,
    0,
  );
  const snapshotId = v4();
  await MyGlobal.prisma.ecommerce_platform_snapshots.create({
    data: {
      id: snapshotId,
      entity_type: "product_variant",
      created_at: new Date(),
    },
  });
  const snapshotVariantId = v4();
  await MyGlobal.prisma.ecommerce_platform_snapshot_variants.create({
    data: {
      id: snapshotVariantId,
      ecommerce_platform_snapshot_id: snapshotId,
      ecommerce_platform_product_variant_id: props.variantId,
      sku_code: currentVariant.sku_code,
      price: currentVariant.price ?? 0,
      stock_quantity: stockQuantity,
      created_at: new Date(),
      options: {
        create: currentVariant.options.map((opt) => ({
          id: v4(),
          ecommerce_platform_snapshot_variant_id: snapshotVariantId,
          key: opt.attribute_key,
          value: opt.attribute_value,
          created_at: new Date(),
        })),
      },
    },
  });
  await MyGlobal.prisma.ecommerce_platform_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  if (
    props.body.options !== undefined &&
    props.body.options.attribute_key !== undefined
  ) {
    const existingOption =
      await MyGlobal.prisma.ecommerce_platform_product_variant_options.findFirst(
        {
          where: {
            ecommerce_platform_product_variant_id: props.variantId,
            attribute_key: props.body.options.attribute_key,
            deleted_at: null,
          },
        },
      );
    if (existingOption !== null) {
      if (props.body.options.attribute_value !== undefined) {
        await MyGlobal.prisma.ecommerce_platform_product_variant_options.update(
          {
            where: { id: existingOption.id },
            data: {
              attribute_value: props.body.options.attribute_value,
              updated_at: new Date(),
            },
          },
        );
      }
    } else if (props.body.options.attribute_value !== undefined) {
      await MyGlobal.prisma.ecommerce_platform_product_variant_options.create({
        data: {
          id: v4(),
          ecommerce_platform_product_variant_id: props.variantId,
          attribute_key: props.body.options.attribute_key,
          attribute_value: props.body.options.attribute_value,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  const updated =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: { id: props.variantId },
        ...EcommercePlatformProductVariantTransformer.select(),
      },
    );
  return await EcommercePlatformProductVariantTransformer.transform(updated);
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
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformSellerProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductVariant.IUpdate;
// }): Promise<IEcommercePlatformProductVariant> {
//   await MyGlobal.prisma.ecommerce_platform_product_variants.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformProductVariantTransformer.select(),
//   });
//   return await EcommercePlatformProductVariantTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------