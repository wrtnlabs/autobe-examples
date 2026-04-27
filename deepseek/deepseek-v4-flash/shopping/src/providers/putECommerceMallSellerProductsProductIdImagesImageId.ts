import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
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
import { ECommerceMallProductImageTransformer } from "../transformers/ECommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IECommerceMallProductImage.IUpdate;
}): Promise<IECommerceMallProductImage> {
  // 1. Verify product exists and belongs to this seller
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        seller_id: true,
        name: true,
        description: true,
        base_price: true,
        category_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify seller approval status is "approved"
  const seller =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { approval_status: true },
    });
  if (seller.approval_status !== "approved") {
    throw new HttpException(
      "Seller account requires administrator approval to manage products",
      403,
    );
  }
  // 3. Validate the image exists and belongs to the specified product
  await MyGlobal.prisma.e_commerce_mall_product_images.findFirstOrThrow({
    where: {
      id: props.imageId,
      e_commerce_mall_product_id: props.productId,
    },
    select: { id: true },
  });
  // 4. Update the image URL (if provided) and set updated_at
  await MyGlobal.prisma.e_commerce_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.url !== undefined && { url: props.body.url }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Create a product snapshot preserving all current images
  const currentImages =
    await MyGlobal.prisma.e_commerce_mall_product_images.findMany({
      where: { e_commerce_mall_product_id: props.productId },
      select: { url: true, sort_order: true },
      orderBy: { sort_order: "asc" },
    });
  const snapshotCreateInput = {
    id: v4(),
    e_commerce_mall_product_id: props.productId,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    created_at: toISOStringSafe(new Date()),
    snapshotImages: {
      create: currentImages.map((img) => ({
        id: v4(),
        url: img.url,
        sort_order: img.sort_order,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      })),
    },
  };
  await MyGlobal.prisma.e_commerce_mall_product_snapshots.create({
    data: snapshotCreateInput,
  });
  // 6. Return the updated image via transformer
  const updated =
    await MyGlobal.prisma.e_commerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ECommerceMallProductImageTransformer.select(),
    });
  return await ECommerceMallProductImageTransformer.transform(updated);
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
// import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductImage.IUpdate;
// }): Promise<IECommerceMallProductImage> {
//   await MyGlobal.prisma.e_commerce_mall_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallProductImageTransformer.select(),
//   });
//   return await ECommerceMallProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------