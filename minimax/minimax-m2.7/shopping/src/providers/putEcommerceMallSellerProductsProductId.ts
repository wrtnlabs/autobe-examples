import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // 1. Fetch product and verify ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      ecommerce_mall_category_id: true,
      name: true,
      description: true,
      base_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Product not found
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Verify seller ownership
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to update this product",
      403,
    );
  }
  // Verify product is not soft-deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Validate categoryId if provided and fetch category name for snapshot
  let categoryName: string;
  if (props.body.categoryId !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.body.categoryId,
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    if (category === null) {
      throw new HttpException("Category not found or has been deleted", 404);
    }
    categoryName = category.name;
  } else {
    // Fetch current category name for snapshot
    const currentCategory =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: { id: product.ecommerce_mall_category_id },
        select: { name: true },
      });
    categoryName = currentCategory?.name ?? "";
  }
  // 3. Prepare update data object with conditional fields
  const updateData: {
    name?: string;
    description?: string;
    ecommerce_mall_category_id?: string;
    base_price?: number;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.categoryId !== undefined) {
    updateData.ecommerce_mall_category_id = props.body.categoryId;
  }
  if (props.body.basePrice !== undefined) {
    updateData.base_price = props.body.basePrice;
  }
  // 4. Create immutable product snapshot with old state
  const snapshotId: string = v4();
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_product_id: product.id,
      ecommerce_mall_seller_id: product.ecommerce_mall_seller_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category_name: categoryName,
      created_at: new Date(),
    },
  });
  // 5. Update the product
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  // 6. Fetch updated product with all relations for response
  const updated =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  // 7. Transform and return
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductId(props: {
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