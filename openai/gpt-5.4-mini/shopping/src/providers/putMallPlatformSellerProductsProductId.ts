import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductTransformer } from "../transformers/MallPlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProduct.IUpdate;
}): Promise<IMallPlatformProduct> {
  const current =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (current.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.category_id !== undefined
        ? { category_id: props.body.category_id }
        : {}),
      ...(props.body.base_price !== undefined
        ? { base_price: props.body.base_price }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...MallPlatformProductTransformer.select(),
    });
  return await MallPlatformProductTransformer.transform(updated);
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
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProduct.IUpdate;
// }): Promise<IMallPlatformProduct> {
//   await MyGlobal.prisma.mall_platform_products.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformProductTransformer.select(),
//   });
//   return await MallPlatformProductTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------