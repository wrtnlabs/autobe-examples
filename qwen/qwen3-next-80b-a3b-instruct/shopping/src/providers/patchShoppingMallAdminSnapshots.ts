import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallAdminSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const {
    entity_type,
    changed_by,
    from_date,
    to_date,
    status,
    page = 1,
    limit = 100,
  } = props.body;
  // Validate entity_type
  if (
    ![
      "product",
      "variant",
      "order_item",
      "review",
      "cancellation_request",
      "refund_request",
    ].includes(entity_type)
  ) {
    throw new HttpException("Invalid entity_type", 400);
  }
  // Define base WHERE conditions
  const whereConditions: Record<string, any> = {};
  if (changed_by) {
    whereConditions.changed_by = changed_by;
  }
  if (from_date) {
    const isoDate = new Date(from_date).toISOString() as string &
      tags.Format<"date-time">;
    whereConditions.changed_at = whereConditions.changed_at || {};
    whereConditions.changed_at.gte = isoDate;
  }
  if (to_date) {
    const isoDate = new Date(to_date).toISOString() as string &
      tags.Format<"date-time">;
    whereConditions.changed_at = whereConditions.changed_at || {};
    whereConditions.changed_at.lte = isoDate;
  }
  if (status) {
    whereConditions.status = status;
  }
  // Define individual entity queries with compatible structure
  const queries = [];
  if (entity_type === "product" || !entity_type) {
    queries.push(
      MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
        select: {
          id: true,
          changed_at: true,
          changed_by: true,
          version: true,
        },
        where: whereConditions,
        orderBy: { changed_at: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    );
  }
  if (entity_type === "variant" || !entity_type) {
    queries.push(
      MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
        select: {
          id: true,
          changed_at: true,
          changed_by: true,
          version: true,
        },
        where: whereConditions,
        orderBy: { changed_at: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    );
  }
  if (entity_type === "order_item" || !entity_type) {
    queries.push(
      MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
        select: {
          id: true,
          changed_at: true,
          changed_by: true,
          product_name: true,
          variant_sku: true,
        },
        where: whereConditions,
        orderBy: { changed_at: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    );
  }
  if (entity_type === "review" || !entity_type) {
    queries.push(
      MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
        select: {
          id: true,
          changed_at: true,
          changed_by: true,
          rating: true,
          content: true,
          is_deleted: true,
        },
        where: whereConditions,
        orderBy: { changed_at: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    );
  }
  if (entity_type === "cancellation_request" || !entity_type) {
    queries.push(
      MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany({
        select: {
          id: true,
          changed_at: true,
          changed_by: true,
          reason: true,
          status: true,
          responder_id: true,
          response_reason: true,
        },
        where: whereConditions,
        orderBy: { changed_at: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    );
  }
  if (entity_type === "refund_request" || !entity_type) {
    queries.push(
      MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
        select: {
          id: true,
          changed_at: true,
          changed_by: true,
          version: true,
          reason: true,
          status: true,
          responder_id: true,
          response_reason: true,
        },
        where: whereConditions,
        orderBy: { changed_at: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    );
  }
  // Execute all queries
  const results: any[][] = await Promise.all(queries);
  // Flatten and restructure into compatible summary format
  const data: IShoppingMallProductSnapshot.ISummary[] = [];
  for (const result of results) {
    for (const item of result) {
      // Create summary object with required properties
      const summary: IShoppingMallProductSnapshot.ISummary = {
        id: item.id,
        status:
          item.changed_by === "customer"
            ? "active"
            : item.changed_by === "seller"
              ? "active"
              : "active",
        display_name: undefined,
      };
      // Set display_name based on entity type and transformer availability (fallback)
      if ("product" in item) {
        // Use product name as display_name
        summary.display_name = item.product?.name || undefined;
      } else if ("variant" in item) {
        // Use variant SKU as display_name
        summary.display_name = item.variant?.sku_code || undefined;
      } else if ("product_name" in item) {
        // Use product name as display_name
        summary.display_name = item.product_name || undefined;
      } else if ("rating" in item) {
        // Use review rating as part of display_name
        summary.display_name = item.rating
          ? `Review ${item.rating}`
          : undefined;
      } else if ("reason" in item && "status" in item) {
        // Use request status as display_name
        summary.display_name = item.status || undefined;
      }
      data.push(summary);
    }
  }
  // Count total records across all tables
  const tableNames = [
    "shopping_mall_product_snapshots",
    "shopping_mall_product_variant_snapshots",
    "shopping_mall_order_item_snapshots",
    "shopping_mall_review_snapshots",
    "shopping_mall_cancellation_request_snapshots",
    "shopping_mall_refund_request_snapshots",
  ];
  const relevantTables = tableNames.filter(
    (table) =>
      entity_type ===
        table
          .replace("shopping_mall", "")
          .toLowerCase()
          .replace(/([a-z])([A-Z])/g, "$1_$2")
          .replace(/_snapshots$/, "") || !entity_type,
  );
  // Use PrismaClient with string index access by casting
  const countPromises = relevantTables.map((table) =>
    (MyGlobal.prisma as any)[table].count({ where: whereConditions }),
  );
  const counts = await Promise.all(countPromises);
  const total = counts.reduce((acc: number, count: number) => acc + count, 0);
  // Handle null/undefined for page and limit with nullish coalescing
  const effectivePage = page ?? 1;
  const effectiveLimit = limit ?? 100;
  return {
    data,
    pagination: {
      current: effectivePage,
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  };
}
