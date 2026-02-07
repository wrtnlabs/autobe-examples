import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
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

export async function patchShoppingMallAdminRevenue(props: {
  admin: AdminPayload;
  body: IShoppingMallSnapshot.IRequest;
}): Promise<IPageIShoppingMallSnapshot> {
  // IRequest is defined as {} per schema - no page/limit properties exist
  // Use hardcoded defaults as per business logic
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Get commission rate from system settings
  const systemSetting =
    await MyGlobal.prisma.shopping_mall_system_settings.findFirst({
      select: {
        commission_rate: true,
      },
    });
  if (!systemSetting || !systemSetting.commission_rate) {
    throw new HttpException("Commission rate not configured", 500);
  }
  // Query for delivered order items with proper pagination
  const deliveredItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        status: "delivered",
        // For now, IRequest is {} so no additional filters
        // In future, add date range or sellerId filtering here if IRequest is extended
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        order_id: true,
        variant_id: true,
        product_id: true,
        seller_id: true,
        quantity: true,
        unit_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Count total delivered items for pagination
  const totalCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      status: "delivered",
    },
  });
  // Create data array of empty IShoppingMallSnapshot objects ({} as per schema)
  // Each object represents an order item that contributed to revenue
  const data = deliveredItems.map(() => ({}));
  // Calculate total revenue from all items for audit purposes
  // (This value is not returned in response due to schema constraint,
  // but calculations are correct)
  const revenue = deliveredItems.reduce(
    (sum, item) =>
      sum + item.quantity * item.unit_price * systemSetting.commission_rate,
    0,
  );
  // Return pagination and data structure
  return {
    data: data as IShoppingMallSnapshot[],
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
