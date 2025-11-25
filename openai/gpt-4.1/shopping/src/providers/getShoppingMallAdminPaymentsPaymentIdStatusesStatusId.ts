import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatus";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPaymentsPaymentIdStatusesStatusId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentStatus> {
  const status =
    await MyGlobal.prisma.shopping_mall_payment_statuses.findUnique({
      where: { id: props.statusId },
    });

  if (!status || status.payment_id !== props.paymentId) {
    throw new HttpException("Payment status transition event not found.", 404);
  }

  return {
    id: status.id,
    payment_id: status.payment_id,
    old_status: status.old_status,
    new_status: status.new_status,
    changed_reason: status.changed_reason,
    changed_at: toISOStringSafe(status.changed_at),
    changed_by_admin_id:
      status.changed_by_admin_id === null ? null : status.changed_by_admin_id,
  };
}
