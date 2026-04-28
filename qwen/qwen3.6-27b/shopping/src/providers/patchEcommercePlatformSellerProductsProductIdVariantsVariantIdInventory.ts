import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformInventoryRecordCollector } from "../collectors/EcommercePlatformInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformInventoryRecordTransformer } from "../transformers/EcommercePlatformInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommercePlatformInventoryRecord.ICreate;
}): Promise<IEcommercePlatformInventoryRecord> {
  const existing =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
        ecommerce_platform_product_id: props.productId,
        product: {
          sellerProfile: {
            seller_id: props.seller.id,
          },
        },
      },
    });
  if (existing === null) {
    throw new HttpException("Product variant not found or access denied", 404);
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_inventory_records.create({
      data: await EcommercePlatformInventoryRecordCollector.collect({
        body: props.body,
        ecommercePlatformProductVariants: { id: existing.id },
      }),
      ...EcommercePlatformInventoryRecordTransformer.select(),
    });
  return await EcommercePlatformInventoryRecordTransformer.transform(record);
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
// import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerProductsProductIdVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformInventoryRecord.ICreate;
// }): Promise<IEcommercePlatformInventoryRecord> {
//   const record = await MyGlobal.prisma.ecommerce_platform_inventory_records.create({
//     data: await EcommercePlatformInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformInventoryRecordTransformer.select(),
//   });
//   return await EcommercePlatformInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------