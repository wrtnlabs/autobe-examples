import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminRefundsRefundRequestIdOverridesOverrideId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  overrideId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundAdminOverride> {
  const { admin, refundRequestId, overrideId } = props;
  // 1. Confirm the parent refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_refund_requests.findUnique({
      where: { id: refundRequestId },
      select: { id: true },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // 2. Retrieve the override record with matching IDs
  const override =
    await MyGlobal.prisma.shopping_refund_admin_overrides.findUnique({
      where: { id: overrideId },
    });
  if (!override || override.shopping_refund_request_id !== refundRequestId) {
    throw new HttpException(
      "Refund admin override not found for this refund request",
      404,
    );
  }
  return {
    id: override.id,
    shopping_refund_request_id: override.shopping_refund_request_id,
    shopping_admin_id: override.shopping_admin_id,
    override_type: override.override_type,
    reason: override.reason,
    detailed_context: override.detailed_context ?? undefined,
    created_at: toISOStringSafe(override.created_at),
  };
}
