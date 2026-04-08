import { IDifferenceEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IDifferenceEntry";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ISnapshotDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshotDatum";
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

export async function getEcommerceMallAdminProductVariantsVariantIdSnapshotsCompare(props: {
  admin: AdminPayload;
  variantId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantSnapshot.ICompare> {
  // Validate variant exists - admin can access any variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
  });
  // Retrieve the two most recent snapshots for this variant
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: { product_variant_id: props.variantId },
      orderBy: { created_at: "desc" },
      take: 2,
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues: {
          select: {
            option_name: true,
            option_value: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_snapshot_option_valuesFindManyArgs,
      },
    });
  if (snapshots.length < 2) {
    throw new HttpException(
      "At least two snapshots are required for comparison",
      400,
    );
  }
  const [after, before] = snapshots;
  // Build option values objects
  const beforeOptionValues = before.optionValues.reduce<Record<string, string>>(
    (acc, ov) => {
      acc[ov.option_name] = ov.option_value;
      return acc;
    },
    {},
  );
  const afterOptionValues = after.optionValues.reduce<Record<string, string>>(
    (acc, ov) => {
      acc[ov.option_name] = ov.option_value;
      return acc;
    },
    {},
  );
  // Build ISnapshotDatum for before snapshot
  const beforeDatum: ISnapshotDatum = {
    type: "object",
    objectValueJson: JSON.stringify({
      id: before.id,
      sku_code: before.sku_code,
      price: before.price,
      created_at: toISOStringSafe(before.created_at),
      optionValues: beforeOptionValues,
    }),
  };
  // Build ISnapshotDatum for after snapshot
  const afterDatum: ISnapshotDatum = {
    type: "object",
    objectValueJson: JSON.stringify({
      id: after.id,
      sku_code: after.sku_code,
      price: after.price,
      created_at: toISOStringSafe(after.created_at),
      optionValues: afterOptionValues,
    }),
  };
  // Calculate differences
  const differences: IDifferenceEntry[] = [];
  // Compare sku_code
  if (before.sku_code !== after.sku_code) {
    differences.push({
      path: ["sku_code"],
      operation: "MODIFIED",
      oldValue: before.sku_code,
      newValue: after.sku_code,
      message: `sku_code was changed: ${before.sku_code} → ${after.sku_code}`,
    });
  }
  // Compare price
  if (before.price !== after.price) {
    differences.push({
      path: ["price"],
      operation: "MODIFIED",
      oldValue: before.price,
      newValue: after.price,
      message: `price was changed: ${before.price} → ${after.price}`,
    });
  }
  // Compare option values
  const allOptionNames = new Set([
    ...Object.keys(beforeOptionValues),
    ...Object.keys(afterOptionValues),
  ]);
  for (const optionName of allOptionNames) {
    const beforeValue = beforeOptionValues[optionName];
    const afterValue = afterOptionValues[optionName];
    if (beforeValue === undefined && afterValue !== undefined) {
      differences.push({
        path: ["optionValues", optionName],
        operation: "ADDED",
        oldValue: null,
        newValue: afterValue,
        message: `optionValues.${optionName} was added: ${afterValue}`,
      });
    } else if (beforeValue !== undefined && afterValue === undefined) {
      differences.push({
        path: ["optionValues", optionName],
        operation: "REMOVED",
        oldValue: beforeValue,
        newValue: null,
        message: `optionValues.${optionName} was removed: ${beforeValue}`,
      });
    } else if (beforeValue !== afterValue) {
      differences.push({
        path: ["optionValues", optionName],
        operation: "MODIFIED",
        oldValue: beforeValue,
        newValue: afterValue,
        message: `optionValues.${optionName} was changed: ${beforeValue} → ${afterValue}`,
      });
    }
  }
  return {
    before: beforeDatum,
    after: afterDatum,
    differences,
  };
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
// import { ISnapshotDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshotDatum";
// import { IDifferenceEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IDifferenceEntry";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminProductVariantsVariantIdSnapshotsCompare(props: {
//   admin: AdminPayload;
//   variantId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot.ICompare> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------