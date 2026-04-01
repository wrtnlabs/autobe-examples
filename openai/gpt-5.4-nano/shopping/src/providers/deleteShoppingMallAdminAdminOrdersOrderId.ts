import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdminAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Snapshot integrity safeguard:
  // shopping_mall_order_items.sellerSnapshot is configured as onDelete: Cascade.
  // Since snapshot records are immutable and required for dispute resolution,
  // we block permanent order deletion when any order item exists (because that
  // would cascade-delete its seller snapshot records).
  const hasOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: { shopping_mall_order_id: order.id },
      select: { id: true },
      orderBy: { created_at: "desc" },
    });
  if (hasOrderItems !== null) {
    throw new HttpException(
      "Deletion blocked: snapshot trail required for dispute resolution.",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_order_items.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });
    await tx.shopping_mall_shipments.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });
    await tx.shopping_mall_orders.delete({ where: { id: order.id } });
  });
}
