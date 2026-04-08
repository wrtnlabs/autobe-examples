import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductVariantsVariantIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  variantId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        ...EcommerceMallProductVariantSnapshotTransformer.select(),
        where: { id: props.snapshotId },
      },
    );
  if (record.product_variant_id !== props.variantId) {
    throw new HttpException("Snapshot not found for this variant", 404);
  }
  return await EcommerceMallProductVariantSnapshotTransformer.transform(record);
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
// import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
// import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminProductVariantsVariantIdSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
//   variantId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductVariantSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------