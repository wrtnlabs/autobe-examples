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
  // Verify variant exists
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
  });
  // Get the two most recent snapshots for comparison
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
        },
      },
    });
  if (snapshots.length === 0) {
    throw new HttpException("No snapshots found for this variant", 404);
  }
  const after = snapshots[0];
  // If only one snapshot, return it as both before and after with no differences
  if (snapshots.length === 1) {
    const afterOptions = after.optionValues.reduce(
      (acc: Record<string, string>, opt) => {
        acc[opt.option_name] = opt.option_value;
        return acc;
      },
      {},
    );
    const datum: ISnapshotDatum = {
      type: "object",
      objectValueJson: JSON.stringify({
        id: after.id,
        sku_code: after.sku_code,
        price: after.price,
        created_at: toISOStringSafe(after.created_at),
        optionValues: afterOptions,
      }),
    };
    return {
      before: datum,
      after: datum,
      differences: [],
    };
  }
  const before = snapshots[1];
  // Convert option values to object
  const beforeOptions = before.optionValues.reduce(
    (acc: Record<string, string>, opt) => {
      acc[opt.option_name] = opt.option_value;
      return acc;
    },
    {},
  );
  const afterOptions = after.optionValues.reduce(
    (acc: Record<string, string>, opt) => {
      acc[opt.option_name] = opt.option_value;
      return acc;
    },
    {},
  );
  // Build ISnapshotDatum for before
  const beforeDatum: ISnapshotDatum = {
    type: "object",
    objectValueJson: JSON.stringify({
      id: before.id,
      sku_code: before.sku_code,
      price: before.price,
      created_at: toISOStringSafe(before.created_at),
      optionValues: beforeOptions,
    }),
  };
  // Build ISnapshotDatum for after
  const afterDatum: ISnapshotDatum = {
    type: "object",
    objectValueJson: JSON.stringify({
      id: after.id,
      sku_code: after.sku_code,
      price: after.price,
      created_at: toISOStringSafe(after.created_at),
      optionValues: afterOptions,
    }),
  };
  // Calculate differences
  const differences: IDifferenceEntry[] = [];
  // Check SKU code change
  if (before.sku_code !== after.sku_code) {
    differences.push({
      path: ["sku_code"],
      operation: "MODIFIED",
      oldValue: before.sku_code,
      newValue: after.sku_code,
      message: `SKU code changed from "${before.sku_code}" to "${after.sku_code}"`,
    });
  }
  // Check price change
  if (before.price !== after.price) {
    differences.push({
      path: ["price"],
      operation: "MODIFIED",
      oldValue: before.price,
      newValue: after.price,
      message: `Price changed from ${before.price} to ${after.price}`,
    });
  }
  // Check option value changes
  const allOptionNames = new Set([
    ...Object.keys(beforeOptions),
    ...Object.keys(afterOptions),
  ]);
  for (const optionName of allOptionNames) {
    const beforeVal = beforeOptions[optionName];
    const afterVal = afterOptions[optionName];
    if (beforeVal === undefined && afterVal !== undefined) {
      differences.push({
        path: ["optionValues", optionName],
        operation: "ADDED",
        oldValue: null,
        newValue: afterVal,
        message: `Option "${optionName}" added with value "${afterVal}"`,
      });
    } else if (beforeVal !== undefined && afterVal === undefined) {
      differences.push({
        path: ["optionValues", optionName],
        operation: "REMOVED",
        oldValue: beforeVal,
        newValue: null,
        message: `Option "${optionName}" removed (was "${beforeVal}")`,
      });
    } else if (beforeVal !== afterVal) {
      differences.push({
        path: ["optionValues", optionName],
        operation: "MODIFIED",
        oldValue: beforeVal,
        newValue: afterVal,
        message: `Option "${optionName}" changed from "${beforeVal}" to "${afterVal}"`,
      });
    }
  }
  return {
    before: beforeDatum,
    after: afterDatum,
    differences,
  };
}
