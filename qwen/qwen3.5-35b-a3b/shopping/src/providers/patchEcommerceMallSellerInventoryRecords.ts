import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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

export async function patchEcommerceMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build base WHERE conditions for seller ownership
  const sellerOwnershipFilter: Prisma.ecommerce_mall_inventory_recordsWhereInput =
    {
      deleted_at: null,
      variant: {
        product: {
          seller_id: props.seller.id,
        },
      },
    };
  // Build additional filters
  const additionalFilters: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    deleted_at: null,
  };
  // Apply variantId filter
  if (props.body.variantId) {
    additionalFilters.ecommerce_mall_product_variant_id = props.body.variantId;
  }
  // Apply reason filter
  if (props.body.reason !== undefined) {
    additionalFilters.reason = props.body.reason;
  }
  // Apply type filter
  if (props.body.type !== undefined) {
    additionalFilters.type = props.body.type;
  }
  // Apply dateRange filter
  if (props.body.dateRange) {
    additionalFilters.created_at = {
      gte: new Date(props.body.dateRange.from),
      lte: new Date(props.body.dateRange.to),
    };
  }
  // Apply quantityChangeRange filter
  if (props.body.quantityChangeRange) {
    additionalFilters.quantity_change = {
      gte: props.body.quantityChangeRange.min,
      lte: props.body.quantityChangeRange.max,
    };
  }
  // Apply search filter (full-text search on reason and description)
  if (props.body.search) {
    additionalFilters.OR = [
      { reason: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Combine seller ownership with additional filters using AND
  const whereConditions: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    AND: [sellerOwnershipFilter, additionalFilters],
  };
  // Build ORDER BY
  const orderByInput = (() => {
    if (props.body.sortBy) {
      const direction = props.body.sortDirection === "ASC" ? "asc" : "desc";
      return [{ [props.body.sortBy]: direction }];
    }
    return [{ created_at: "desc" }];
  })() satisfies Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput[];
  // Execute query with seller ownership join
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      ecommerce_mall_product_variant_id: true,
      quantity_change: true,
      remaining_quantity: true,
      reason: true,
      type: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      ecommerce_mall_order_id: true,
      ecommerce_mall_cancellation_request_id: true,
      ecommerce_mall_refund_request_id: true,
    } satisfies Prisma.ecommerce_mall_inventory_recordsSelect,
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereConditions,
  });
  // Map to ISummary DTO
  const summaryData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    variant_id: record.ecommerce_mall_product_variant_id as string &
      tags.Format<"uuid">,
    quantity_change: record.quantity_change,
    remaining_quantity: record.remaining_quantity,
    reason: record.reason,
    type: record.type,
    description: record.description ?? null,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
    deleted_at: record.deleted_at?.toISOString() ?? null,
    ecommerce_mall_order_id: record.ecommerce_mall_order_id as
      | (string & tags.Format<"uuid">)
      | null,
    ecommerce_mall_cancellation_request_id:
      record.ecommerce_mall_cancellation_request_id as
        | (string & tags.Format<"uuid">)
        | null,
    ecommerce_mall_refund_request_id:
      record.ecommerce_mall_refund_request_id as
        | (string & tags.Format<"uuid">)
        | null,
  })) satisfies IEcommerceMallInventoryRecord.ISummary[];
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: summaryData,
  } satisfies IPageIEcommerceMallInventoryRecord.ISummary;
}
