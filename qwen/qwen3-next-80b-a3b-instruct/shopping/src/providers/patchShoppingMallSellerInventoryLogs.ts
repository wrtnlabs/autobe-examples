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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerInventoryLogs(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryLog.IRequest;
}): Promise<IPageIShoppingMallInventoryLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Validate bounds for page and limit (1-100)
  const safePage = Math.max(1, Math.min(100, page));
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;
  // Build where condition: only use variant_id for filtering, no nested relation since logs are directly linked to variant_id
  const whereInput: Prisma.shopping_mall_inventory_logsWhereInput = {
    variant_id: props.body.variant_id,
    reason: props.body.reason,
    created_at: {
      gte: props.body.created_at_gte,
      lte: props.body.created_at_lte,
    },
    reference_id: props.body.reference_id,
  } satisfies Prisma.shopping_mall_inventory_logsWhereInput;
  // Fetch paginated data
  const data = await MyGlobal.prisma.shopping_mall_inventory_logs.findMany({
    where: whereInput,
    skip,
    take: safeLimit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      variant_id: true,
      change_quantity: true,
      reason: true,
      reference_id: true,
      notes: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_inventory_logs.count({
    where: whereInput,
  });
  // Transform records with explicit type-safe mapping
  const transformedData: IShoppingMallInventoryLog.ISummary[] = data.map(
    (log) => ({
      id: log.id as string & tags.Format<"uuid">,
      variant_id: log.variant_id as string & tags.Format<"uuid">,
      change_quantity: log.change_quantity,
      reason: typia.assert<IShoppingMallInventoryLog.ISummary["reason"]>(
        log.reason,
      ),
      reference_id:
        log.reference_id === null
          ? null
          : (log.reference_id as string & tags.Format<"uuid">),
      notes: log.notes === null ? null : log.notes,
      created_at: toISOStringSafe(log.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(log.updated_at) as string &
        tags.Format<"date-time">,
    }),
  );
  // Return fully typed and satisfied response
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIShoppingMallInventoryLog.ISummary;
}
