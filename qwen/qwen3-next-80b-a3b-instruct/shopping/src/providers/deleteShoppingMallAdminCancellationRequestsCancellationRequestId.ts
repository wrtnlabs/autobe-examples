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

export async function deleteShoppingMallAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify cancellation request exists
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: {
        id: props.cancellationRequestId,
      },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify admin session is active
  const activeSession =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
      where: {
        id: props.admin.session_id,
        expired_at: { gt: new Date() },
        admin: {
          id: props.admin.id,
          deleted_at: null,
        },
      },
    });
  if (!activeSession) {
    throw new HttpException("Invalid or expired admin session", 403);
  }
  // Perform deletion
  await MyGlobal.prisma.shopping_mall_cancellation_requests.delete({
    where: {
      id: props.cancellationRequestId,
    },
  });
}
