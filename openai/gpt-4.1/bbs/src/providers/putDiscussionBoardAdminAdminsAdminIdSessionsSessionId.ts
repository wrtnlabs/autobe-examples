import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.IUpdate;
}): Promise<IDiscussionBoardAdminSession> {
  // 1. Confirm target admin exists and is active
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin account not found or deleted.", 404);
  }

  // 2. Find the session and confirm it belongs to this admin
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });
  if (!session || session.admin_id !== props.adminId) {
    throw new HttpException("Session not found for that admin.", 404);
  }

  // 3. Prepare update data (only expired_at allowed)
  const updateData: { expired_at?: string | null } = {};
  if ("expired_at" in props.body) {
    updateData.expired_at = props.body.expired_at ?? null;
  }

  // Only allow update if expired_at is provided (no other fields allowed)
  if (!("expired_at" in props.body)) {
    throw new HttpException("Only expired_at can be updated.", 400);
  }

  const updated = await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: props.sessionId },
    data: updateData,
  });

  // 4. Embed admin summary for session DTO (date fields to ISO string)
  const adminSummary = {
    id: admin.id,
    email: admin.email,
    created_at:
      admin.created_at instanceof Date
        ? toISOStringSafe(admin.created_at)
        : admin.created_at,
    updated_at:
      admin.updated_at instanceof Date
        ? toISOStringSafe(admin.updated_at)
        : admin.updated_at,
    deleted_at:
      admin.deleted_at instanceof Date
        ? toISOStringSafe(admin.deleted_at)
        : (admin.deleted_at ?? undefined),
  };

  return {
    id: updated.id,
    admin: adminSummary,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at:
      updated.created_at instanceof Date
        ? toISOStringSafe(updated.created_at)
        : updated.created_at,
    expired_at:
      typeof updated.expired_at === "undefined"
        ? undefined
        : updated.expired_at === null
          ? null
          : updated.expired_at instanceof Date
            ? toISOStringSafe(updated.expired_at)
            : updated.expired_at,
  };
}
