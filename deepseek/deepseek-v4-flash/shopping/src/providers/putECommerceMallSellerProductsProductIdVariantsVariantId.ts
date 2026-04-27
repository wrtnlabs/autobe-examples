import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallProductVariantTransformer } from "../transformers/ECommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IECommerceMallProductVariant.IUpdate;
}): Promise<IECommerceMallProductVariant> {
  // Load variant with product and seller info
  const variant =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        e_commerce_mall_product_id: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            seller_id: true,
            name: true,
            description: true,
            base_price: true,
            category_id: true,
            seller: {
              select: {
                id: true,
                approval_status: true,
              },
            },
          },
        },
      },
    });
  // Verify variant belongs to the specified product
  if (variant.e_commerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  // Reject if variant is soft-deleted
  if (variant.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted variant", 400);
  }
  // Verify seller ownership
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify seller has approved status
  if (variant.product.seller.approval_status !== "approved") {
    throw new HttpException(
      "Seller must be approved to edit variants. Administrator approval required before selling.",
      400,
    );
  }
  // Validate SKU uniqueness if changed
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== variant.sku_code
  ) {
    const existingSku =
      await MyGlobal.prisma.e_commerce_mall_product_variants.findUnique({
        where: { sku_code: props.body.sku_code },
        select: { id: true },
      });
    if (existingSku !== null) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  // Validate options if provided
  if (props.body.options !== undefined) {
    const bodyKeys = props.body.options.map((o) => o.key);
    // Reject duplicate keys in the request body
    if (new Set(bodyKeys).size !== bodyKeys.length) {
      throw new HttpException("Duplicate option keys are not allowed", 400);
    }
    // Validate option key and value are non-empty
    for (const opt of props.body.options) {
      if (opt.key.trim().length === 0 || opt.value.trim().length === 0) {
        throw new HttpException("Option key and value must not be empty", 400);
      }
    }
    // Validate no other variant of the same product has identical option combos
    const otherVariants =
      await MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
        where: {
          e_commerce_mall_product_id: props.productId,
          id: { not: props.variantId },
          deleted_at: null,
        },
        select: {
          id: true,
          options: {
            where: { deleted_at: null },
            select: { key: true, value: true },
          },
        },
      });
    const newOptionsSorted = [...props.body.options]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((o) => `${o.key}:${o.value}`)
      .join(",");
    for (const other of otherVariants) {
      const otherOptionsSorted = [...other.options]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((o) => `${o.key}:${o.value}`)
        .join(",");
      if (newOptionsSorted === otherOptionsSorted) {
        throw new HttpException(
          "Another variant with the same option combination already exists",
          409,
        );
      }
    }
  }
  // Create product snapshot BEFORE editing
  const now = toISOStringSafe(new Date());
  const snapshotId = v4();
  const [allVariants, allImages] = await Promise.all([
    MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
      where: {
        e_commerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        options: {
          where: { deleted_at: null },
          select: { key: true, value: true },
          orderBy: { key: "asc" },
        },
      },
    }),
    MyGlobal.prisma.e_commerce_mall_product_images.findMany({
      where: { e_commerce_mall_product_id: props.productId },
      select: { url: true, sort_order: true },
      orderBy: { sort_order: "asc" },
    }),
  ]);
  // Create the product-level snapshot
  await MyGlobal.prisma.e_commerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      e_commerce_mall_product_id: props.productId,
      ...(variant.product.category_id !== null
        ? { e_commerce_mall_category_id: variant.product.category_id }
        : { e_commerce_mall_category_id: null }),
      name: variant.product.name,
      description: variant.product.description,
      base_price: variant.product.base_price,
      created_at: now,
    },
  });
  // Create snapshot variant records for each current variant
  for (const v of allVariants) {
    const displayName = v.options.map((o) => o.value).join(" / ");
    await MyGlobal.prisma.e_commerce_mall_product_snapshot_variants.create({
      data: {
        id: v4(),
        snapshot: { connect: { id: snapshotId } },
        sku: v.sku_code,
        name: displayName,
        price: v.price,
        created_at: now,
      },
    });
  }
  // Create snapshot image records for each current product image
  for (const img of allImages) {
    await MyGlobal.prisma.e_commerce_mall_product_snapshot_images.create({
      data: {
        id: v4(),
        productSnapshot: { connect: { id: snapshotId } },
        url: img.url,
        sort_order: img.sort_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // Update variant fields
  const updateNow = toISOStringSafe(new Date());
  await MyGlobal.prisma.e_commerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.sku_code !== undefined
        ? { sku_code: props.body.sku_code }
        : {}),
      ...(props.body.price !== undefined ? { price: props.body.price } : {}),
      updated_at: updateNow,
    },
  });
  // Handle options diff if options were provided
  if (props.body.options !== undefined) {
    const existingOptions =
      await MyGlobal.prisma.e_commerce_mall_product_variant_options.findMany({
        where: {
          e_commerce_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
      });
    const existingKeys = new Set(existingOptions.map((o) => o.key));
    const bodyKeySet = new Set(props.body.options.map((o) => o.key));
    // Soft-delete options that exist in DB but not in the request body
    for (const existing of existingOptions) {
      if (!bodyKeySet.has(existing.key)) {
        const optionUpdateNow = toISOStringSafe(new Date());
        await MyGlobal.prisma.e_commerce_mall_product_variant_options.update({
          where: { id: existing.id },
          data: {
            deleted_at: optionUpdateNow,
            updated_at: optionUpdateNow,
          },
        });
      }
    }
    // Create new options or update existing ones
    for (const opt of props.body.options) {
      const foundOption = existingOptions.find((o) => o.key === opt.key);
      if (foundOption !== undefined) {
        if (foundOption.value !== opt.value) {
          const optionUpdateNow = toISOStringSafe(new Date());
          await MyGlobal.prisma.e_commerce_mall_product_variant_options.update({
            where: { id: foundOption.id },
            data: {
              value: opt.value,
              updated_at: optionUpdateNow,
            },
          });
        }
      } else {
        const optionCreateNow = toISOStringSafe(new Date());
        await MyGlobal.prisma.e_commerce_mall_product_variant_options.create({
          data: {
            id: v4(),
            key: opt.key,
            value: opt.value,
            variant: { connect: { id: props.variantId } },
            created_at: optionCreateNow,
            updated_at: optionCreateNow,
            deleted_at: null,
          },
        });
      }
    }
  }
  // Fetch and return the fully updated variant with transformer
  const updated =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ECommerceMallProductVariantTransformer.select(),
    });
  return await ECommerceMallProductVariantTransformer.transform(updated);
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
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSellerProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductVariant.IUpdate;
// }): Promise<IECommerceMallProductVariant> {
//   await MyGlobal.prisma.e_commerce_mall_product_variants.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallProductVariantTransformer.select(),
//   });
//   return await ECommerceMallProductVariantTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------