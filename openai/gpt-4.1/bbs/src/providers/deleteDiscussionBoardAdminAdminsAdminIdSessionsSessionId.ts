import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch admin by ID and ensure existence
  const adminAccount = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!adminAccount) {
    throw new HttpException("Admin account not found or deactivated", 404);
  }

  // Step 2: Fetch the session to delete
  const targetSession =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: props.sessionId,
        admin_id: props.adminId,
      },
    });
  if (!targetSession) {
    throw new HttpException("Session not found for this admin", 404);
  }

  // Step 3: Allow only if (A) own session or (B) any admin (all admins privileged)
  // In this system, any admin can delete any admin session, so no extra check needed
  // (Actor privilege checked by system; endpoint requires admin auth)

  // Step 4: Delete the session
  await MyGlobal.prisma.discussion_board_admin_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
