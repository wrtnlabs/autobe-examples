import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallSellerVariantsVariantIdInventoryHistoryExport(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord.IExportResult> {
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId, is_active: true },
      select: { id: true, product_id: true },
    });
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: variant.product_id },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: { variant_id: props.variantId },
      orderBy: { timestamp: "asc" },
    });
  const recordsWithCumulative = records.reduce<
    Array<{
      timestamp: string & tags.Format<"date-time">;
      variant_id: string & tags.Format<"uuid">;
      quantity_change: number;
      reason: string;
      cumulative_stock_level: number;
    }>
  >((acc, record) => {
    const cumulative =
      acc.length > 0
        ? acc[acc.length - 1].cumulative_stock_level + record.quantity_change
        : record.quantity_change;
    acc.push({
      timestamp: toISOStringSafe(record.timestamp),
      variant_id: record.variant_id as string & tags.Format<"uuid">,
      quantity_change: record.quantity_change,
      reason: record.reason,
      cumulative_stock_level: cumulative,
    });
    return acc;
  }, []);
  const csvLines = [
    "timestamp,variant_id,quantity_change,reason,cumulative_stock_level",
    ...recordsWithCumulative.map((item) =>
      [
        item.timestamp,
        item.variant_id,
        item.quantity_change.toString(),
        item.reason,
        item.cumulative_stock_level.toString(),
      ].join(","),
    ),
  ];
  const csvContent =
    csvLines.join(
      "\
",
    );
  const fileTimestamp = toISOStringSafe(new Date());
  const fileName = `inventory-export-${props.variantId}-${fileTimestamp}.csv`;
  const csvBuffer = Buffer.from(csvContent, "utf-8");
  const base64Content = csvBuffer.toString("base64");
  const fileUri = `data:text/csv;charset=utf-8,${base64Content}`;
  return { uri: fileUri };
}
