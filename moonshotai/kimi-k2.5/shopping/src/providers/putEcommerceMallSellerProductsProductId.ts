import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // 1. Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            options: {
              select: {
                id: true,
                option_name: true,
                option_value: true,
              },
            } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
      },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate category if provided
  if (props.body.categoryId !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
      {
        where: { id: props.body.categoryId },
      },
    );
    if (!category) {
      throw new HttpException("Category not found", 404);
    }
  }
  // 3. Create product snapshot before update
  const snapshotId = v4() as string & tags.Format<"uuid">;
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      product: { connect: { id: product.id } },
      name: product.name,
      description: product.description,
      category: { connect: { id: product.category_id } },
      base_price: product.base_price,
      created_at: now,
      snapshot_images: {
        create: product.images.map((image) => ({
          id: v4() as string & tags.Format<"uuid">,
          image_url: image.image_url,
          display_order: image.display_order,
        })),
      },
      snapshot_variants: {
        create: product.variants.map((variant) => ({
          id: v4() as string & tags.Format<"uuid">,
          variant: { connect: { id: variant.id } },
          sku_code: variant.sku_code,
          price: variant.price,
          created_at: now,
          snapshot_option_values: {
            create: variant.options.map((option) => ({
              id: v4() as string & tags.Format<"uuid">,
              option_name: option.option_name,
              option_value: option.option_value,
            })),
          },
        })),
      },
    },
  });
  // 4. Update the product
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.categoryId !== undefined && {
        category: { connect: { id: props.body.categoryId } },
      }),
      ...(props.body.basePrice !== undefined && {
        base_price: props.body.basePrice,
      }),
      updated_at: now,
    },
  });
  // 5. Return updated product with transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  return await EcommerceMallProductTransformer.transform(updated);
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string;
//   body: IEcommerceMallProduct.IUpdate;
// }): Promise<IEcommerceMallProduct> {
//   await MyGlobal.prisma.ecommerce_mall_products.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallProductTransformer.select(),
//   });
//   return await EcommerceMallProductTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------