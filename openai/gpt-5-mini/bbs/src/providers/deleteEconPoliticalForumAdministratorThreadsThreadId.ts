import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteEconPoliticalForumAdministratorThreadsThreadId(props: {
  administrator: AdministratorPayload;
  threadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, threadId } = props;

  // Authorization: ensure the caller is an enrolled administrator
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });
  if (!adminRecord)
    throw new HttpException("Unauthorized: administrator not enrolled", 403);

  // Load thread and validate existence (and not already deleted)
  const thread = await MyGlobal.prisma.econ_political_forum_threads.findUnique({
    where: { id: threadId },
  });
  if (!thread) throw new HttpException("Not Found", 404);
  if (thread.deleted_at !== null) throw new HttpException("Not Found", 404);

  // Check for active legal holds that would block deletion
  const activeHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: {
        thread_id: threadId,
        is_active: true,
      },
    });
  if (activeHold)
    throw new HttpException(
      "Forbidden: active legal hold prevents deletion",
      403,
    );

  // Prepare ISO timestamp once (use provided helper)
  const now = toISOStringSafe(new Date()) satisfies string as string &
    tags.Format<"date-time">;

  // Soft-delete the thread
  await MyGlobal.prisma.econ_political_forum_threads.update({
    where: { id: threadId },
    data: { deleted_at: now },
  });

  // Record moderation log (administrative deletion)
  await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
    data: {
      id: v4() satisfies string as string & tags.Format<"uuid">,
      moderator_id: null,
      acted_admin_id: adminRecord.id,
      target_post_id: null,
      target_thread_id: threadId,
      moderation_case_id: null,
      action_type: "soft_delete",
      reason_code: "administrative_deletion",
      rationale: null,
      evidence_reference: null,
      created_at: now,
    },
  });

  // Record audit log for compliance
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() satisfies string as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      moderator_id: null,
      post_id: null,
      thread_id: threadId,
      report_id: null,
      moderation_case_id: null,
      action_type: "soft_delete",
      target_type: "thread",
      target_identifier: threadId,
      details: null,
      created_at: now,
      created_by_system: false,
    },
  });

  return;
}
