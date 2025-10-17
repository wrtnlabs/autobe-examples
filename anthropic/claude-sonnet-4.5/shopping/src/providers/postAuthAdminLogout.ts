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

export async function postAuthAdminLogout(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.ILogout;
}): Promise<IShoppingMallAdmin.ILogoutResponse> {
  const { admin, body } = props;

  // Find the session matching the refresh token and admin ID
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      user_type: "admin",
      admin_id: admin.id,
      is_revoked: false,
    },
  });

  // Verify session exists and belongs to the authenticated admin
  if (!session) {
    throw new HttpException("Session not found or already revoked", 403);
  }

  // Update session to mark as revoked
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
      last_activity_at: now,
    },
  });

  return {
    message: "Logout successful. Session has been terminated.",
  };
}
