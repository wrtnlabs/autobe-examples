import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductVariantCollector } from "../collectors/MallPlatformProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductVariantTransformer } from "../transformers/MallPlatformProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.ICreate;
}): Promise<IMallPlatformProductVariant> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        sellerAccount: {
          select: {
            id: true,
          },
        },
      },
    });
  if (product.sellerAccount.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  try {
    const created = await MyGlobal.prisma.mall_platform_product_variants.create(
      {
        data: await MallPlatformProductVariantCollector.collect({
          body: props.body,
          product: { id: product.id },
        }),
        ...MallPlatformProductVariantTransformer.select(),
      },
    );
    return await MallPlatformProductVariantTransformer.transform(created);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "P2002"
    ) {
      throw new HttpException("SKU code already exists", 409);
    }
    throw error;
  }
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
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductVariant.ICreate;
// }): Promise<IMallPlatformProductVariant> {
//   const record = await MyGlobal.prisma.mall_platform_product_variants.create({
//     data: await MallPlatformProductVariantCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformProductVariantTransformer.select(),
//   });
//   return await MallPlatformProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------