import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
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

export async function patchShoppingMallAdminInventoryVariantIdHistory(props: {
  admin: AdminPayload;
  variantId: string;
  body?: IShoppingMallInventoryLog.IRequest;
}): Promise<IPageIShoppingMallInventoryLog> {
  // Extract pagination from body (default to 1 and 100 as per standard)
  const page = props.body?.page ?? 1;
  const limit = props.body?.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate variantId is UUIDv4 format
  if (!typia.is<string & tags.Format<"uuid">>(props.variantId)) {
    throw new HttpException("Invalid variantId format", 400);
  }
  // Query inventory logs for the variant
  const data = await MyGlobal.prisma.shopping_mall_inventory_logs.findMany({
    where: {
      variant_id: props.variantId,
    },
    orderBy: {
      created_at: "desc" as const,
    },
    skip,
    take: limit,
    select: {
      id: true,
      change_quantity: true,
      reason: true,
      reference_id: true,
      created_at: true,
      notes: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_inventory_logs.count({
    where: {
      variant_id: props.variantId,
    },
  });
  // Transform data: convert created_at to ISO string, preserve all other fields
  const transformedData = data.map((log) => ({
    id: log.id satisfies string as string & tags.Format<"uuid">,
    change_quantity: log.change_quantity,
    reason: typia.assert<IShoppingMallInventoryLog["reason"]>(log.reason),
    reference_id: log.reference_id,
    created_at: toISOStringSafe(log.created_at) satisfies string as string &
      tags.Format<"date-time">,
    notes: log.notes,
  }));
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallInventoryLog;
}
