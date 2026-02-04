import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminInventoryRecordsInventoryId(props: {
  admin: AdminPayload;
  inventoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify admin authorization (already handled by decorator, but validate session)
  const adminSession =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique({
      where: {
        id: props.admin.session_id,
        expired_at: { gt: new Date() },
        admin: {
          id: props.admin.id,
          deleted_at: null,
        },
      },
    });
  if (!adminSession) {
    throw new HttpException("Unauthorized", 401);
  }
  // Verify inventory record exists
  const inventoryRecord =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { id: props.inventoryId },
    });
  if (!inventoryRecord) {
    throw new HttpException("Inventory record not found", 404);
  }
  // Check for dependencies in order items (using actual foreign key column inventory_id)
  const orderItemDependency =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: { inventory_id: props.inventoryId },
    });
  if (orderItemDependency) {
    throw new HttpException(
      "Cannot delete inventory record: referenced by order items",
      409,
    );
  }
  // Check for dependencies in cancellation requests (using actual foreign key column inventory_id)
  const cancellationDependency =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: { inventory_id: props.inventoryId },
    });
  if (cancellationDependency) {
    throw new HttpException(
      "Cannot delete inventory record: referenced by cancellation requests",
      409,
    );
  }
  // Check for dependencies in refund requests (using actual foreign key column inventory_id)
  const refundDependency =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: { inventory_id: props.inventoryId },
    });
  if (refundDependency) {
    throw new HttpException(
      "Cannot delete inventory record: referenced by refund requests",
      409,
    );
  }
  // Perform hard deletion (no soft_delete_column exists)
  await MyGlobal.prisma.shopping_mall_inventory_records.delete({
    where: { id: props.inventoryId },
  });
}
