import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotOptionValueTransformer } from "../transformers/EcommerceMallProductVariantSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductVariantSnapshotsSnapshotIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  snapshotId: string;
  optionValueId: string;
}): Promise<IEcommerceMallProductVariantSnapshotOptionValue> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.findFirstOrThrow(
      {
        where: {
          id: props.optionValueId,
          ecommerce_mall_product_variant_snapshot_id: props.snapshotId,
        },
        ...EcommerceMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotOptionValueTransformer.transform(
    record,
  );
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
// import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductVariantSnapshotsSnapshotIdOptionValuesOptionValueId(props: {
//   seller: SellerPayload;
//   snapshotId: string;
//   optionValueId: string;
// }): Promise<IEcommerceMallProductVariantSnapshotOptionValue> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.findFirstOrThrow({
//     ...EcommerceMallProductVariantSnapshotOptionValueTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantSnapshotOptionValueTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------