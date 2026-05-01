import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProductsProductIdVariantsVariantIdInventoryRecordsRecordId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryRecord> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirstOrThrow({
      where: {
        id: props.recordId,
        shopping_mall_product_variant_id: props.variantId,
      },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  return await ShoppingMallInventoryRecordTransformer.transform(record);
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
// import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminProductsProductIdVariantsVariantIdInventoryRecordsRecordId(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   recordId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallInventoryRecord> {
//   const record = await MyGlobal.prisma.shopping_mall_inventory_records.findFirstOrThrow({
//     ...ShoppingMallInventoryRecordTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------