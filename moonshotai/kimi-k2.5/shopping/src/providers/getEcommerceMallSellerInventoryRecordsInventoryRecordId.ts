import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordTransformer } from "../transformers/EcommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerInventoryRecordsInventoryRecordId(props: {
  seller: SellerPayload;
  inventoryRecordId: string;
}): Promise<IEcommerceMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirstOrThrow({
      ...EcommerceMallInventoryRecordTransformer.select(),
      where: {
        id: props.inventoryRecordId,
        variant: {
          product: {
            seller: {
              id: props.seller.id,
            },
          },
        },
      },
    });
  return await EcommerceMallInventoryRecordTransformer.transform(record);
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
// import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerInventoryRecordsInventoryRecordId(props: {
//   seller: SellerPayload;
//   inventoryRecordId: string;
// }): Promise<IEcommerceMallInventoryRecord> {
//   const record = await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirstOrThrow({
//     ...EcommerceMallInventoryRecordTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------