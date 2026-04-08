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

export async function patchEcommerceMallSellerSellersMeProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // Step 1: Verify seller is approved
  const sellerRecord = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    select: {
      approval_status: true,
    },
  });
  if (!sellerRecord || sellerRecord.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
  }
  // Step 2: Find product and verify ownership
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
      ecommerce_mall_category_id: true,
      ecommerce_mall_seller_id: true,
      created_at: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Step 3: Validate categoryId if provided
  if (props.body.categoryId !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.body.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (!category) {
      throw new HttpException("Category not found or deleted", 400);
    }
  }
  // Step 4: Get category name for snapshot
  const categoryForSnapshot =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: product.ecommerce_mall_category_id,
      },
      select: {
        name: true,
      },
    });
  const categoryName = categoryForSnapshot?.name ?? "Unknown";
  // Step 5: Create immutable snapshot before update
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_product_id: product.id,
      ecommerce_mall_seller_id: product.ecommerce_mall_seller_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category_name: categoryName,
      created_at: new Date(),
    },
  });
  // Step 6: Build update data with only provided fields
  const updateData: Prisma.ecommerce_mall_productsUpdateInput = {
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
    updateData.category = { connect: { id: props.body.categoryId } };
  }
  // Step 7: Update product
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: {
      id: props.productId,
    },
    data: updateData,
  });
  // Step 8: Fetch updated product with full relations
  const updatedProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      ...EcommerceMallProductTransformer.select(),
    });
  // Step 9: Return transformed product
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
// export async function patchEcommerceMallSellerSellersMeProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProduct.IUpdate;
// }): Promise<IEcommerceMallProduct> {
//   const record = await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
//     ...EcommerceMallProductTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------