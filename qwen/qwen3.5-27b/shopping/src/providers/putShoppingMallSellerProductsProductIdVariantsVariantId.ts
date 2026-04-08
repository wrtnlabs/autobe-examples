import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        variantOptions: {
          select: {
            key: true,
            value: true,
          },
        },
      },
    });
  // Validate SKU uniqueness if changing
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== variant.sku_code
  ) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          sku_code: props.body.sku_code,
          id: {
            not: props.variantId,
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (duplicate !== null) {
      throw new HttpException("SKU code already exists for this product", 400);
    }
  }
  // Create snapshot before update (only scalar fields, no variantOptions)
  await MyGlobal.prisma.shopping_mall_variant_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_variant_id: props.variantId,
      sku_code: variant.sku_code,
      price: variant.price ?? 0,
      created_at: new Date(),
    },
  });
  // Update variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: {
      id: props.variantId,
    },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  // Delete existing variant options
  await MyGlobal.prisma.shopping_mall_product_variant_options.deleteMany({
    where: {
      shopping_mall_product_variant_id: props.variantId,
      deleted_at: null,
    },
  });
  // Insert new variant options if provided
  if (
    props.body.variantOptions !== undefined &&
    props.body.variantOptions.length > 0
  ) {
    // Validate duplicate keys
    const keys = props.body.variantOptions.map((opt) => opt.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      throw new HttpException("Duplicate option keys in variant options", 400);
    }
    await MyGlobal.prisma.shopping_mall_product_variant_options.createMany({
      data: props.body.variantOptions.map((opt) => ({
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id: props.variantId,
        key: opt.key,
        value: opt.value,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      })),
    });
  }
  // Return updated variant
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
      },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
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
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariant.IUpdate;
// }): Promise<IShoppingMallProductVariant> {
//   await MyGlobal.prisma.shopping_mall_product_variants.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallProductVariantTransformer.select(),
//   });
//   return await ShoppingMallProductVariantTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------