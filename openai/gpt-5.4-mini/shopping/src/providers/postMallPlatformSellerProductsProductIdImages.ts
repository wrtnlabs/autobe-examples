import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductImageCollector } from "../collectors/MallPlatformProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductImageTransformer } from "../transformers/MallPlatformProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.ICreate;
}): Promise<IMallPlatformProductImage> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.$transaction(async (prisma) => {
    const images = await prisma.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    });
    if (images.some((image) => image.image_url === props.body.imageUrl)) {
      throw new HttpException("Product image URL already exists", 409);
    }
    if (images.some((image) => image.sort_order === props.body.sortOrder)) {
      throw new HttpException("Product image sort order already exists", 409);
    }
    return await prisma.mall_platform_product_images.create({
      data: await MallPlatformProductImageCollector.collect({
        body: {
          imageUrl: props.body.imageUrl,
          sortOrder: props.body.sortOrder,
          isMain: images.length === 0 ? true : props.body.isMain,
        },
        product: {
          id: props.productId,
        },
      }),
      ...MallPlatformProductImageTransformer.select(),
    });
  });
  return await MallPlatformProductImageTransformer.transform(record);
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductImage.ICreate;
// }): Promise<IMallPlatformProductImage> {
//   const record = await MyGlobal.prisma.mall_platform_product_images.create({
//     data: await MallPlatformProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformProductImageTransformer.select(),
//   });
//   return await MallPlatformProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------