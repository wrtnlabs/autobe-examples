import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteEconPoliticalForumRegisteredUserThreadsThreadId(props: {
  registeredUser: RegistereduserPayload;
  threadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { registeredUser, threadId } = props;

  const thread =
    await MyGlobal.prisma.econ_political_forum_threads.findUniqueOrThrow({
      where: { id: threadId },
      select: { id: true, author_id: true, deleted_at: true },
    });

  if (thread.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (thread.author_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: only the author can delete this thread",
      403,
    );
  }

  const activeHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { thread_id: thread.id, is_active: true },
      select: { id: true },
    });
  if (activeHold)
    throw new HttpException(
      "Forbidden: active legal hold prevents deletion",
      403,
    );

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.econ_political_forum_threads.update({
      where: { id: threadId },
      data: { deleted_at: now, updated_at: now },
    }),

    MyGlobal.prisma.econ_political_forum_moderation_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: null,
        target_post_id: null,
        target_thread_id: threadId,
        moderation_case_id: null,
        acted_admin_id: null,
        action_type: "soft_delete",
        reason_code: "user_delete",
        rationale: "Soft-deleted by thread author",
        evidence_reference: null,
        created_at: now,
        deleted_at: null,
      },
    }),

    MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: registeredUser.id,
        moderator_id: null,
        post_id: null,
        thread_id: threadId,
        report_id: null,
        moderation_case_id: null,
        action_type: "soft_delete",
        target_type: "thread",
        target_identifier: threadId,
        details: "Thread soft-deleted by author",
        created_at: now,
        created_by_system: false,
      },
    }),
  ]);

  return;
}
