import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        variants: {
          where: { deleted_at: null },
          select: {
            id: true,
            code: true,
            price: true,
            optionValues: {
              select: {
                key: true,
                value: true,
              },
            } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const sellerRecord =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { approval_status: true, suspended_at: true },
    });
  if (
    sellerRecord.approval_status !== "approved" ||
    sellerRecord.suspended_at !== null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.body.shopping_mall_category_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshot = await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_product_id: product.id,
        shopping_mall_category_id: product.shopping_mall_category_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        created_at: now,
      },
    });
    for (const image of product.images) {
      await tx.shopping_mall_product_snapshot_images.create({
        data: {
          id: v4(),
          shopping_mall_product_snapshot_id: snapshot.id,
          shopping_mall_product_image_id: image.id,
          image_url: image.image_url,
          display_order: image.display_order,
          created_at: now,
        },
      });
    }
    for (const variant of product.variants) {
      const optionValuesStr = variant.optionValues
        .map((ov) => `${ov.key}: ${ov.value}`)
        .join(", ");
      const stockResult = await tx.shopping_mall_inventory_records.aggregate({
        where: { shopping_mall_product_variant_id: variant.id },
        _sum: { quantity_change: true },
      });
      await tx.shopping_mall_product_variant_snapshots.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: variant.id,
          shopping_mall_product_snapshot_id: snapshot.id,
          sku_code: variant.code,
          option_values: optionValuesStr,
          price: variant.price,
          stock_quantity: stockResult._sum.quantity_change ?? 0,
          created_at: now,
        },
      });
    }
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: {
        name: props.body.name,
        description: props.body.description,
        shopping_mall_category_id: props.body.shopping_mall_category_id,
        base_price: props.body.base_price,
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
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
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProduct.IUpdate;
// }): Promise<IShoppingMallProduct> {
//   await MyGlobal.prisma.shopping_mall_products.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallProductTransformer.select(),
//   });
//   return await ShoppingMallProductTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------