import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminShipmentsCode(props: {
  admin: AdminPayload;
  code: string;
}): Promise<void> {
  // Step 1: Find existing shipment by code; ignore soft-deleted
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: { code: props.code, deleted_at: null },
    select: { id: true, dispatched_at: true, delivered_at: true, status: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Step 2: Business assertions: cannot delete if dispatched or delivered
  if (shipment.dispatched_at !== null || shipment.delivered_at !== null) {
    throw new HttpException(
      "Cannot delete a shipment that has already been dispatched or delivered",
      409,
    );
  }
  // Step 3: Only allow when status is not yet dispatched (e.g., 'pending' or 'created'); adjust based on business rules
  if (shipment.status !== "pending" && shipment.status !== "created") {
    throw new HttpException(
      "Cannot delete shipment not in 'pending' or 'created' status",
      409,
    );
  }
  // Step 4: Permanently delete shipment (hard delete)
  await MyGlobal.prisma.shopping_shipments.delete({
    where: { id: shipment.id },
  });
}
