import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminDisputesDisputeId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the dispute and ensure it exists and is not already deleted
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: { id: props.disputeId },
  });

  if (!dispute || dispute.deleted_at !== null) {
    throw new HttpException("Dispute not found or already deleted", 404);
  }

  // 2. Soft-delete by setting deleted_at to current time (ISO 8601)
  await MyGlobal.prisma.shopping_mall_disputes.update({
    where: { id: props.disputeId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
