import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminIdAdminSessionsAdminSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  adminSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the admin session by id
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique(
    {
      where: { id: props.adminSessionId },
    },
  );

  // Check if session exists
  if (!session) {
    throw new HttpException("Admin session not found", 404);
  }

  // Verify session belongs to admin
  if (session.shopping_mall_admin_id !== props.adminId) {
    throw new HttpException("Forbidden", 403);
  }

  // Delete the session
  await MyGlobal.prisma.shopping_mall_admin_sessions.delete({
    where: { id: props.adminSessionId },
  });
}
