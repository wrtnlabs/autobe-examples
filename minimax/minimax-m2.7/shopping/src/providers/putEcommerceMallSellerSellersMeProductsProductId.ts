import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function putEcommerceMallSellerSellersMeProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // 1. Verify seller approval status
  const sellerRecord = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      approval_status: true,
    },
  });
  if (!sellerRecord) {
    throw new HttpException("Seller not found", 404);
  }
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException("Only approved sellers can edit products", 403);
  }
  // 2. Query product and verify ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      ecommerce_mall_category_id: true,
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
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate category if provided
  if (props.body.categoryId !== undefined) {
    const categoryExists =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          id: props.body.categoryId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!categoryExists) {
      throw new HttpException("Category not found or deleted", 400);
    }
  }
  // 4. Create product snapshot before updating
  const snapshotId = v4();
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_product_id: product.id,
      ecommerce_mall_seller_id: props.seller.id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category_name: product.category.name,
      created_at: new Date(),
    },
  });
  // 5. Build update data with only provided fields
  const updateData: {
    updated_at: Date;
    name?: string;
    description?: string;
    base_price?: number;
    ecommerce_mall_category_id?: string;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.basePrice !== undefined) {
    updateData.base_price = props.body.basePrice;
  }
  if (props.body.categoryId !== undefined) {
    updateData.ecommerce_mall_category_id = props.body.categoryId;
  }
  // 6. Update the product
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  // 7. Fetch updated product with all relations for response
  const updatedProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  // 8. Return transformed response
  return await EcommerceMallProductTransformer.transform(updatedProduct);
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerSellersMeProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
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