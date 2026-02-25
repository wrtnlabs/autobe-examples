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

export async function patchShoppingMallSellerInventoryVariantIdHistory(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<IPageIShoppingMallInventoryLog> {
  // Validate variantId is UUID format (runtime guard)
  if (!typia.is<string & tags.Format<"uuid">>(props.variantId)) {
    throw new HttpException("Invalid variant ID format", 400);
  }
  // Extract pagination parameters from request body (default: page=1, limit=100)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query inventory logs for the variant, newest first
  // Join to ensure seller owns the variant
  const logs = await MyGlobal.prisma.shopping_mall_inventory_logs.findMany({
    where: {
      variant_id: props.variantId,
      variant: {
        product: {
          seller_id: props.seller.id,
        },
      },
    },
    orderBy: {
      created_at: "desc",
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
  // Count total matching records for pagination
  const total = await MyGlobal.prisma.shopping_mall_inventory_logs.count({
    where: {
      variant_id: props.variantId,
      variant: {
        product: {
          seller_id: props.seller.id,
        },
      },
    },
  });
  // Convert Date to ISO string with type safety using toISOStringSafe
  const transformedLogs: IShoppingMallInventoryLog[] = logs.map((log) => ({
    ...log,
    created_at: toISOStringSafe(log.created_at),
    reason: typia.assert<
      "order" | "restock" | "cancellation" | "refund" | "adjustment" | "loss"
    >(log.reason),
  }));
  // Return paginated result
  return {
    data: transformedLogs,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallInventoryLog;
}
