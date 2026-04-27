import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallInventoryRecordTransformer } from "../transformers/ECommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAdministratorProductsProductIdVariantsVariantIdInventory(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IECommerceMallInventoryRecord.ICreate;
}): Promise<IECommerceMallInventoryRecord> {
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        visibility: true,
      },
    });
  if (product.visibility === "suspended" || product.visibility === "deleted") {
    throw new HttpException(
      "Cannot adjust inventory for a suspended or deleted product",
      400,
    );
  }
  const variant =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        e_commerce_mall_product_id: props.productId,
      },
      select: { id: true },
    });
  const record = await MyGlobal.prisma.e_commerce_mall_inventory_records.create(
    {
      data: {
        id: v4(),
        quantity_change: props.body.quantity_change,
        reason: props.body.reason,
        created_at: new Date().toISOString(),
        productVariant: {
          connect: { id: variant.id },
        },
      },
      ...ECommerceMallInventoryRecordTransformer.select(),
    },
  );
  return await ECommerceMallInventoryRecordTransformer.transform(record);
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
// import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAdministratorProductsProductIdVariantsVariantIdInventory(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IECommerceMallInventoryRecord.ICreate;
// }): Promise<IECommerceMallInventoryRecord> {
//   const record = await MyGlobal.prisma.e_commerce_mall_inventory_records.create({
//     data: await ECommerceMallInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallInventoryRecordTransformer.select(),
//   });
//   return await ECommerceMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------