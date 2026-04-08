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
  // Verify variant exists and seller owns it (or is admin)
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  // Check authorization - seller can only access their own variants
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the two most recent snapshots for this variant
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
  if (snapshots.length < 2) {
    throw new HttpException(
      "At least two snapshots are required for comparison",
      400,
    );
  }
  const [after, before] = snapshots;
  // Build snapshot datums
  const buildSnapshotDatum = (
    snapshot: (typeof snapshots)[0],
  ): ISnapshotDatum => ({
    type: "object",
    objectValueJson: JSON.stringify({
      id: snapshot.id,
      sku_code: snapshot.sku_code,
      price: snapshot.price,
      created_at: snapshot.created_at.toISOString(),
      optionValues: snapshot.optionValues.reduce(
        (acc, ov) => ({
          ...acc,
          [ov.option_name]: ov.option_value,
        }),
        {} as Record<string, string>,
      ),
    }),
  });
  const beforeDatum = buildSnapshotDatum(before);
  const afterDatum = buildSnapshotDatum(after);
  // Calculate differences
  const differences: IDifferenceEntry[] = [];
  // Compare sku_code
  if (before.sku_code !== after.sku_code) {
    differences.push({
      path: ["sku_code"],
      operation: "MODIFIED",
      oldValue: before.sku_code,
      newValue: after.sku_code,
      message: `SKU code changed from "${before.sku_code}" to "${after.sku_code}"`,
    });
  }
  // Compare price
  if (before.price !== after.price) {
    differences.push({
      path: ["price"],
      operation: "MODIFIED",
      oldValue: before.price,
      newValue: after.price,
      message: `Price changed from ${before.price} to ${after.price}`,
    });
  }
  // Compare optionValues
  const beforeOptions = before.optionValues.reduce(
    (acc, ov) => ({
      ...acc,
      [ov.option_name]: ov.option_value,
    }),
    {} as Record<string, string>,
  );
  const afterOptions = after.optionValues.reduce(
    (acc, ov) => ({
      ...acc,
      [ov.option_name]: ov.option_value,
    }),
    {} as Record<string, string>,
  );
  const allOptionKeys = new Set([
    ...Object.keys(beforeOptions),
    ...Object.keys(afterOptions),
  ]);
  for (const key of allOptionKeys) {
    const beforeVal = beforeOptions[key];
    const afterVal = afterOptions[key];
    if (beforeVal === undefined && afterVal !== undefined) {
      differences.push({
        path: ["optionValues", key],
        operation: "ADDED",
        oldValue: null,
        newValue: afterVal,
        message: `Option "${key}" was added with value "${afterVal}"`,
      });
    } else if (beforeVal !== undefined && afterVal === undefined) {
      differences.push({
        path: ["optionValues", key],
        operation: "REMOVED",
        oldValue: beforeVal,
        newValue: null,
        message: `Option "${key}" with value "${beforeVal}" was removed`,
      });
    } else if (beforeVal !== afterVal) {
      differences.push({
        path: ["optionValues", key],
        operation: "MODIFIED",
        oldValue: beforeVal,
        newValue: afterVal,
        message: `Option "${key}" changed from "${beforeVal}" to "${afterVal}"`,
      });
    }
  }
  return {
    before: beforeDatum,
    after: afterDatum,
    differences,
  };
}
