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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductVariantsVariantIdSnapshotsCompare(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<IEcommerceMallProductVariantSnapshot.ICompare> {
  // Verify variant exists and belongs to this seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        product: {
          select: {
            seller_id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindFirstArgs);
  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the two most recent snapshots for comparison
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: {
        product_variant_id: props.variantId,
      },
      orderBy: {
        created_at: "desc",
      },
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
        },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs);
  if (snapshots.length < 2) {
    throw new HttpException(
      "At least two snapshots are required for comparison",
      400,
    );
  }
  const [after, before] = snapshots;
  // Build optionValues objects
  const beforeOptions: Record<string, string> = {};
  before.optionValues.forEach((ov) => {
    beforeOptions[ov.option_name] = ov.option_value;
  });
  const afterOptions: Record<string, string> = {};
  after.optionValues.forEach((ov) => {
    afterOptions[ov.option_name] = ov.option_value;
  });
  // Build ISnapshotDatum for before
  const beforeSnapshotDatum: ISnapshotDatum = {
    type: "object",
    objectValueJson: JSON.stringify({
      id: before.id,
      skuCode: before.sku_code,
      price: before.price,
      createdAt: toISOStringSafe(before.created_at),
      optionValues: beforeOptions,
    }),
  };
  // Build ISnapshotDatum for after
  const afterSnapshotDatum: ISnapshotDatum = {
    type: "object",
    objectValueJson: JSON.stringify({
      id: after.id,
      skuCode: after.sku_code,
      price: after.price,
      createdAt: toISOStringSafe(after.created_at),
      optionValues: afterOptions,
    }),
  };
  // Calculate differences
  const differences: IDifferenceEntry[] = [];
  // Compare sku_code
  if (before.sku_code !== after.sku_code) {
    differences.push({
      path: ["skuCode"],
      operation: "MODIFIED",
      oldValue: before.sku_code,
      newValue: after.sku_code,
      message: `skuCode was modified: '${before.sku_code}' → '${after.sku_code}'`,
    });
  }
  // Compare price
  if (before.price !== after.price) {
    differences.push({
      path: ["price"],
      operation: "MODIFIED",
      oldValue: before.price,
      newValue: after.price,
      message: `price was modified: ${before.price} → ${after.price}`,
    });
  }
  // Compare optionValues
  const allOptionKeys = new Set([
    ...Object.keys(beforeOptions),
    ...Object.keys(afterOptions),
  ]);
  for (const key of allOptionKeys) {
    const beforeValue = beforeOptions[key];
    const afterValue = afterOptions[key];
    if (!(key in beforeOptions)) {
      differences.push({
        path: ["optionValues", key],
        operation: "ADDED",
        oldValue: null,
        newValue: afterValue,
        message: `optionValues.${key} was added`,
      });
    } else if (!(key in afterOptions)) {
      differences.push({
        path: ["optionValues", key],
        operation: "REMOVED",
        oldValue: beforeValue,
        newValue: null,
        message: `optionValues.${key} was removed`,
      });
    } else if (beforeValue !== afterValue) {
      differences.push({
        path: ["optionValues", key],
        operation: "MODIFIED",
        oldValue: beforeValue,
        newValue: afterValue,
        message: `optionValues.${key} was modified: '${beforeValue}' → '${afterValue}'`,
      });
    }
  }
  return {
    before: beforeSnapshotDatum,
    after: afterSnapshotDatum,
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
// export async function getEcommerceMallSellerProductVariantsVariantIdSnapshotsCompare(props: {
//   seller: SellerPayload;
//   variantId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot.ICompare> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------