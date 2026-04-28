import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformProductImageCollector } from "../collectors/EcommercePlatformProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductImageTransformer } from "../transformers/EcommercePlatformProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductImage.ICreate;
}): Promise<IEcommercePlatformProductImage> {
  const product =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        ecommerce_platform_seller_profile_id: true,
      },
    });
  if (product.ecommerce_platform_seller_profile_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.ecommerce_platform_product_images.create(
    {
      data: EcommercePlatformProductImageCollector.collect({
        body: props.body,
        ecommercePlatformProducts: { id: props.productId },
      }),
      ...EcommercePlatformProductImageTransformer.select(),
    },
  );
  return await EcommercePlatformProductImageTransformer.transform(record);
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
// export async function postEcommercePlatformSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductImage.ICreate;
// }): Promise<IEcommercePlatformProductImage> {
//   const record = await MyGlobal.prisma.ecommerce_platform_product_images.create({
//     data: await EcommercePlatformProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformProductImageTransformer.select(),
//   });
//   return await EcommercePlatformProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------