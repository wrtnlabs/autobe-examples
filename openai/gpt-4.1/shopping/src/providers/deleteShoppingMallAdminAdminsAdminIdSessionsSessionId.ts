import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the session by id
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: props.sessionId,
    },
  });

  // 2. Validate if session exists and belongs to the provided adminId
  if (session === null || session.shopping_mall_admin_id !== props.adminId) {
    throw new HttpException("Session not found", 404);
  }

  // 3. Delete the session
  await MyGlobal.prisma.shopping_mall_admin_sessions.delete({
    where: { id: props.sessionId },
  });
}
