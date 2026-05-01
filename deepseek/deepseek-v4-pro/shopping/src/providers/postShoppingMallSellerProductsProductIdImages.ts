import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        name: true,
        description: true,
        base_price: true,
        shopping_mall_category_id: true,
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
          orderBy: { display_order: "asc" },
        },
        variants: {
          where: { deleted_at: null },
          select: {
            id: true,
            code: true,
            price: true,
            optionValues: {
              select: { key: true, value: true },
            },
          },
        },
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { id: true, suspended_at: true },
  });
  if (seller.suspended_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const maxDisplayOrder =
    product.images.length > 0
      ? Math.max(...product.images.map((img) => img.display_order))
      : -1;
  const nextDisplayOrder = maxDisplayOrder + 1;
  const snapshot = await MyGlobal.prisma.shopping_mall_product_snapshots.create(
    {
      data: {
        id: v4(),
        product: { connect: { id: props.productId } },
        category: {
          connect: { id: product.shopping_mall_category_id },
        },
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        created_at: new Date(),
      },
    },
  );
  for (const img of product.images) {
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.create({
      data: {
        id: v4(),
        snapshot: { connect: { id: snapshot.id } },
        originalImage: { connect: { id: img.id } },
        image_url: img.image_url,
        display_order: img.display_order,
        created_at: new Date(),
      },
    });
  }
  for (const variant of product.variants) {
    const optionValuesStr = variant.optionValues
      .map((ov) => `${ov.key}: ${ov.value}`)
      .join(", ");
    const stockAgg =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { shopping_mall_product_variant_id: variant.id },
        _sum: { quantity_change: true },
      });
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
      data: {
        id: v4(),
        variant: { connect: { id: variant.id } },
        productSnapshot: { connect: { id: snapshot.id } },
        sku_code: variant.code,
        option_values: optionValuesStr,
        price: variant.price,
        stock_quantity: stockAgg._sum.quantity_change ?? 0,
        created_at: new Date(),
      },
    });
  }
  const record = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: await ShoppingMallProductImageCollector.collect({
      body: props.body,
      product: { id: props.productId },
      displayOrder: nextDisplayOrder,
    }),
    ...ShoppingMallProductImageTransformer.select(),
  });
  return await ShoppingMallProductImageTransformer.transform(record);
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
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductImage.ICreate;
// }): Promise<IShoppingMallProductImage> {
//   const record = await MyGlobal.prisma.shopping_mall_product_images.create({
//     data: await ShoppingMallProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallProductImageTransformer.select(),
//   });
//   return await ShoppingMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------