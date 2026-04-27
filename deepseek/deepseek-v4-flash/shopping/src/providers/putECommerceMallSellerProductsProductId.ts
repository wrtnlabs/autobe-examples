import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
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
import { ECommerceMallProductTransformer } from "../transformers/ECommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProduct.IUpdate;
}): Promise<IECommerceMallProduct> {
  // 1. Validate seller approval status
  const sellerRecord = await MyGlobal.prisma.e_commerce_mall_sellers.findFirst({
    where: { id: props.seller.id, deleted_at: null },
    select: { id: true, approval_status: true },
  });
  if (sellerRecord === null) {
    throw new HttpException("Seller account not found", 404);
  }
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException(
      "Administrator approval is required before you can manage products",
      403,
    );
  }
  // 2. Verify product exists and belongs to authenticated seller
  const existingProduct =
    await MyGlobal.prisma.e_commerce_mall_products.findFirst({
      where: { id: props.productId, deleted_at: null },
      select: {
        id: true,
        seller_id: true,
        name: true,
        description: true,
        base_price: true,
        category_id: true,
      },
    });
  if (existingProduct === null) {
    throw new HttpException("Product not found", 404);
  }
  if (existingProduct.seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to edit this product",
      403,
    );
  }
  // 3. Validate category_id if explicitly provided
  if (props.body.category_id !== undefined) {
    if (props.body.category_id !== null) {
      const category =
        await MyGlobal.prisma.e_commerce_mall_categories.findFirst({
          where: { id: props.body.category_id, deleted_at: null },
          select: { id: true },
        });
      if (category === null) {
        throw new HttpException(
          "The specified category does not exist or has been deleted",
          400,
        );
      }
    }
  }
  // 4. Fetch current variants and images for snapshot
  const [currentVariants, currentImages] = await Promise.all([
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
        } satisfies Prisma.e_commerce_mall_product_variant_optionsFindManyArgs,
      },
    }),
    MyGlobal.prisma.e_commerce_mall_product_images.findMany({
      where: { e_commerce_mall_product_id: props.productId },
      select: { url: true, sort_order: true },
      orderBy: { sort_order: "asc" },
    }),
  ]);
  // 5. Create product snapshot (capture current state BEFORE update)
  const snapshotId = v4();
  const nowIso = new Date().toISOString();
  await MyGlobal.prisma.e_commerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      e_commerce_mall_product_id: props.productId,
      e_commerce_mall_category_id: existingProduct.category_id,
      name: existingProduct.name,
      description: existingProduct.description,
      base_price: existingProduct.base_price,
      created_at: nowIso,
      variantSnapshots: {
        create: currentVariants.map((variant) => ({
          id: v4(),
          sku: variant.sku_code,
          name: variant.options
            .map((opt) => `${opt.key}: ${opt.value}`)
            .join(", "),
          price: variant.price,
          created_at: nowIso,
        })),
      },
      snapshotImages: {
        create: currentImages.map((image) => ({
          id: v4(),
          url: image.url,
          sort_order: image.sort_order,
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
        })),
      },
    },
  });
  // 6. Build update payload (only provided fields)
  const updateData: {
    name?: string;
    description?: string;
    base_price?: number;
    category_id?: string | null;
    updated_at?: string;
  } = { updated_at: nowIso };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.base_price !== undefined) {
    updateData.base_price = props.body.base_price;
  }
  if (props.body.category_id !== undefined) {
    updateData.category_id = props.body.category_id;
  }
  await MyGlobal.prisma.e_commerce_mall_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  // 7. Fetch and return updated product via transformer
  const updated =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ECommerceMallProductTransformer.select(),
    });
  return await ECommerceMallProductTransformer.transform(updated);
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
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IECommerceMallProduct.IUpdate;
// }): Promise<IECommerceMallProduct> {
//   await MyGlobal.prisma.e_commerce_mall_products.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallProductTransformer.select(),
//   });
//   return await ECommerceMallProductTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------