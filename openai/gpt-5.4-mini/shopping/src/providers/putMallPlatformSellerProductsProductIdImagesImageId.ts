import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductImageTransformer } from "../transformers/MallPlatformProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IUpdate;
}): Promise<IMallPlatformProductImage> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const product = await prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        deleted_at: true,
      },
    });
    if (product.seller_account_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (product.deleted_at !== null) {
      throw new HttpException("Product is not available for maintenance", 400);
    }
    const image = await prisma.mall_platform_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        mall_platform_product_id: true,
      },
    });
    if (image.mall_platform_product_id !== props.productId) {
      throw new HttpException("Forbidden", 403);
    }
    return await prisma.mall_platform_product_images.update({
      where: { id: props.imageId },
      data: {
        ...(props.body.imageUrl !== undefined && {
          image_url: props.body.imageUrl,
        }),
        ...(props.body.sortOrder !== undefined && {
          sort_order: props.body.sortOrder,
        }),
        ...(props.body.isMain !== undefined && {
          is_main: props.body.isMain,
        }),
      },
      ...MallPlatformProductImageTransformer.select(),
    });
  });
  return await MallPlatformProductImageTransformer.transform(updated);
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
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductImage.IUpdate;
// }): Promise<IMallPlatformProductImage> {
//   await MyGlobal.prisma.mall_platform_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformProductImageTransformer.select(),
//   });
//   return await MallPlatformProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------