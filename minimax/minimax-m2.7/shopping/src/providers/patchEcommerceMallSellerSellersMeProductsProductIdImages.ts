import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellersMeProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorderRequest;
}): Promise<IEcommerceMallProductImage[]> {
  // Step 1: Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const imageIds = props.body.imageIds;
  // Step 2: Validate all imageIds exist and belong to this product
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        id: { in: imageIds },
        product_id: props.productId,
      },
      select: { id: true },
    });
  if (existingImages.length !== imageIds.length) {
    throw new HttpException(
      "Invalid image ID or image does not belong to this product",
      400,
    );
  }
  // Step 3: Update display_order for each image in a transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(
    imageIds.map((imageId, index) =>
      MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: imageId },
        data: {
          display_order: index,
          updated_at: now,
        },
      }),
    ),
  );
  // Step 4: Return all product images ordered by display_order
  const images = await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
    where: { product_id: props.productId },
    ...EcommerceMallProductImageTransformer.select(),
    orderBy: { display_order: "asc" },
  });
  return await ArrayUtil.asyncMap(
    images,
    EcommerceMallProductImageTransformer.transform,
  );
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
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellersMeProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.IReorderRequest;
// }): Promise<IEcommerceMallProductImage> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------