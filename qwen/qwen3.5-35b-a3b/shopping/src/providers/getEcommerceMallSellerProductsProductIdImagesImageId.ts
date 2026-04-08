import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function getEcommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductImage> {
  // Verify the product exists and is owned by this seller
  await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // Retrieve the image with ownership and active status verification
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
      ...EcommerceMallProductImageTransformer.select(),
      where: {
        id: props.imageId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  return await EcommerceMallProductImageTransformer.transform(record);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductImage> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------