import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformInventoryRecordTransformer } from "../transformers/MallPlatformInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerProductsProductIdVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformInventoryRecord> {
  const record =
    await MyGlobal.prisma.mall_platform_inventory_records.findFirstOrThrow({
      where: {
        id: props.inventoryRecordId,
        mall_platform_product_variant_id: props.variantId,
        productVariant: {
          id: props.variantId,
          product: {
            id: props.productId,
            sellerAccount: {
              id: props.seller.id,
            },
          },
        },
      },
      ...MallPlatformInventoryRecordTransformer.select(),
    });
  return await MallPlatformInventoryRecordTransformer.transform(record);
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerProductsProductIdVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   inventoryRecordId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformInventoryRecord> {
//   const record = await MyGlobal.prisma.mall_platform_inventory_records.findFirstOrThrow({
//     ...MallPlatformInventoryRecordTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------