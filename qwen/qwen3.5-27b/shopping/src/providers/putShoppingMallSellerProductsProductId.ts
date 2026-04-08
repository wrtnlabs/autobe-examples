import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
  // Step 1: Find product and verify seller ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        name: true,
        description: true,
        shopping_mall_category_id: true,
        base_price: true,
        deleted_at: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product is deleted", 404);
  }
  // Step 2: Check for pending order items (paid or shipped) for any variant
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        productVariant: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingOrderItems.length > 0) {
    throw new HttpException(
      "Cannot update product with pending order items",
      400,
    );
  }
  // Step 3: Check for pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
          },
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingCancellationRequests.length > 0) {
    throw new HttpException(
      "Cannot update product with pending cancellation requests",
      400,
    );
  }
  // Step 4: Check for pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
          },
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingRefundRequests.length > 0) {
    throw new HttpException(
      "Cannot update product with pending refund requests",
      400,
    );
  }
  // Step 5: Validate name uniqueness if name is being updated
  if (props.body.name !== undefined && props.body.name !== product.name) {
    const duplicateProduct =
      await MyGlobal.prisma.shopping_mall_products.findFirst({
        where: {
          shopping_mall_seller_id: props.seller.id,
          name: props.body.name,
          id: { not: props.productId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (duplicateProduct !== null) {
      throw new HttpException("Product name must be unique per seller", 400);
    }
  }
  // Step 6: Validate base_price > 0 if provided
  if (props.body.base_price !== undefined && props.body.base_price <= 0) {
    throw new HttpException("Base price must be greater than zero", 400);
  }
  // Step 7: Create snapshot before modification
  const imagesBefore =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
      orderBy: { display_order: "asc" },
    });
  const imagesBeforeString = imagesBefore.map((img) => img.id).join(",");
  const imagesAfter = imagesBeforeString;
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      name_before: props.body.name !== undefined ? product.name : null,
      name_after: props.body.name !== undefined ? props.body.name : null,
      description_before:
        props.body.description !== undefined ? product.description : null,
      description_after:
        props.body.description !== undefined ? props.body.description : null,
      category_id_before:
        props.body.shopping_mall_category_id !== undefined
          ? product.shopping_mall_category_id
          : null,
      category_id_after:
        props.body.shopping_mall_category_id !== undefined
          ? props.body.shopping_mall_category_id
          : null,
      base_price_before:
        props.body.base_price !== undefined ? product.base_price : null,
      base_price_after:
        props.body.base_price !== undefined ? props.body.base_price : null,
      images_before: imagesBeforeString,
      images_after: imagesAfter,
      created_at: new Date(),
    },
  });
  // Step 8: Update product fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.shopping_mall_category_id !== undefined) {
    updateData.shopping_mall_category_id = props.body.shopping_mall_category_id;
  }
  if (props.body.base_price !== undefined) {
    updateData.base_price = props.body.base_price;
  }
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  // Step 9: Return updated product
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
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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