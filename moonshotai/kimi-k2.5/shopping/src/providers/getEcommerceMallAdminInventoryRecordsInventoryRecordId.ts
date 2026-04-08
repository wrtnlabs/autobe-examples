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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminInventoryRecordsInventoryRecordId(props: {
  admin: AdminPayload;
  inventoryRecordId: string;
}): Promise<IEcommerceMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirstOrThrow({
      where: { id: props.inventoryRecordId },
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            created_at: true,
            updated_at: true,
            product: {
              select: {
                ecommerce_mall_seller_id: true,
              },
            },
            options: {
              select: {
                id: true,
                option_name: true,
                option_value: true,
              },
            },
          },
        },
      },
    });
  if (record.variant.product.ecommerce_mall_seller_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id as string & tags.Format<"uuid">,
    variantId: record.variant.id as string & tags.Format<"uuid">,
    quantityChange: record.quantity_change,
    reason: record.reason,
    createdAt: record.created_at.toISOString() as string &
      tags.Format<"date-time">,
    variant: {
      id: record.variant.id as string & tags.Format<"uuid">,
      skuCode: record.variant.sku_code,
      price: record.variant.price,
      options: record.variant.options.map((opt) => ({
        id: opt.id as string & tags.Format<"uuid">,
        optionName: opt.option_name,
        optionValue: opt.option_value,
      })),
      createdAt: record.variant.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: record.variant.updated_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IEcommerceMallProductVariant.ISummary,
  } satisfies IEcommerceMallInventoryRecord;
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
// export async function getEcommerceMallAdminInventoryRecordsInventoryRecordId(props: {
//   admin: AdminPayload;
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