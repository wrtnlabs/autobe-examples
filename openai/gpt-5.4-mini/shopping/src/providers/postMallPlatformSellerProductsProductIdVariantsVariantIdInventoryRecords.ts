import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformInventoryRecordCollector } from "../collectors/MallPlatformInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformInventoryRecordTransformer } from "../transformers/MallPlatformInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IMallPlatformInventoryRecord.ICreate;
}): Promise<IMallPlatformInventoryRecord> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const product = await prisma.mall_platform_products.findUniqueOrThrow({
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
    const variant =
      await prisma.mall_platform_product_variants.findUniqueOrThrow({
        where: { id: props.variantId },
        select: {
          id: true,
          product: {
            select: {
              id: true,
            },
          },
        },
      });
    if (variant.product.id !== product.id) {
      throw new HttpException(
        "The variant does not belong to the specified product",
        400,
      );
    }
    const created = await prisma.mall_platform_inventory_records.create({
      data: await MallPlatformInventoryRecordCollector.collect({
        body: props.body,
        mallPlatformProductVariants: {
          id: variant.id,
        },
      }),
      ...MallPlatformInventoryRecordTransformer.select(),
    });
    return await MallPlatformInventoryRecordTransformer.transform(created);
  });
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
// import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IMallPlatformInventoryRecord.ICreate;
// }): Promise<IMallPlatformInventoryRecord> {
//   const record = await MyGlobal.prisma.mall_platform_inventory_records.create({
//     data: await MallPlatformInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformInventoryRecordTransformer.select(),
//   });
//   return await MallPlatformInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------