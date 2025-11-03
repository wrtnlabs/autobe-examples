import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the seller: must exist, not already soft deleted
  const seller = await MyGlobal.prisma.shopping_sellers.findFirstOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });

  // 2. Prevent deletion if seller has unresolved order fulfillments
  const hasActiveOrders = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_seller_id: props.sellerId,
      deleted_at: null,
      status: {
        in: ["pending", "processing", "shipped"],
      },
    },
  });
  if (hasActiveOrders) {
    throw new HttpException(
      "Cannot delete: Seller has unresolved active order fulfillment.",
      409,
    );
  }

  // 3. Prevent deletion if seller is involved in unresolved disputes
  const hasActiveDispute =
    await MyGlobal.prisma.shopping_policy_violations.findFirst({
      where: {
        OR: [
          { affected_seller_id: props.sellerId },
          { reported_by_seller_id: props.sellerId },
        ],
        deleted_at: null,
        status: {
          in: ["open", "under_review", "escalated"],
        },
      },
    });
  if (hasActiveDispute) {
    throw new HttpException(
      "Cannot delete: Seller is involved in an unresolved dispute.",
      409,
    );
  }

  // 4. Hard delete seller account (irreversible)
  await MyGlobal.prisma.shopping_sellers.delete({
    where: {
      id: props.sellerId,
    },
  });

  // 5. Write audit log for compliance
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: props.sellerId,
      category: "admin",
      event_type: "SELLER_HARD_DELETE",
      ip: null,
      description: `Permanent deletion of seller by admin. Seller: ${props.sellerId}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
