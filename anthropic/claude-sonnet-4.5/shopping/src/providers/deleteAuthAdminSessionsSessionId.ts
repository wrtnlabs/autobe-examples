import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteAuthAdminSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin.ISessionRevokeResponse> {
  const { admin, sessionId } = props;

  // Fetch the session - throws 404 if not found
  const session =
    await MyGlobal.prisma.shopping_mall_sessions.findUniqueOrThrow({
      where: { id: sessionId },
    });

  // Verify session belongs to the authenticated admin
  if (session.user_type !== "admin") {
    throw new HttpException(
      "You do not have permission to revoke this session",
      403,
    );
  }

  if (session.admin_id !== admin.id) {
    throw new HttpException(
      "You do not have permission to revoke this session",
      403,
    );
  }

  // Check if session is already revoked
  if (session.is_revoked) {
    throw new HttpException("This session has already been revoked", 400);
  }

  // Revoke the session
  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: { id: sessionId },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(new Date()),
    },
  });

  // Return success message
  return {
    message: "Session revoked successfully",
  } satisfies IShoppingMallAdmin.ISessionRevokeResponse;
}
