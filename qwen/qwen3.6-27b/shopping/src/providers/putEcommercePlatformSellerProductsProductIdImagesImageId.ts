import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductImageTransformer } from "../transformers/EcommercePlatformProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductImage.IUpdate;
}): Promise<IEcommercePlatformProductImage> {
  const image =
    await MyGlobal.prisma.ecommerce_platform_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        ecommerce_platform_product_id: true,
        product: {
          select: {
            id: true,
            ecommerce_platform_seller_profile_id: true,
          },
        },
      },
    });
  if (image.ecommerce_platform_product_id !== props.productId) {
    throw new HttpException(
      "Product image does not belong to the specified product",
      404,
    );
  }
  if (image.product.ecommerce_platform_seller_profile_id !== props.seller.id) {
    throw new HttpException(
      "Product does not belong to the authenticated seller",
      403,
    );
  }
  try {
    await MyGlobal.prisma.ecommerce_platform_product_images.update({
      where: { id: props.imageId },
      data: {
        ...(props.body.uri !== undefined && { uri: props.body.uri }),
        ...(props.body.order_index !== undefined && {
          order_index: props.body.order_index,
        }),
        updated_at: new Date(),
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new HttpException("Duplicate order_index for the product", 409);
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.ecommerce_platform_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommercePlatformProductImageTransformer.select(),
    });
  return await EcommercePlatformProductImageTransformer.transform(updated);
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
// import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductImage.IUpdate;
// }): Promise<IEcommercePlatformProductImage> {
//   await MyGlobal.prisma.ecommerce_platform_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformProductImageTransformer.select(),
//   });
//   return await EcommercePlatformProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------