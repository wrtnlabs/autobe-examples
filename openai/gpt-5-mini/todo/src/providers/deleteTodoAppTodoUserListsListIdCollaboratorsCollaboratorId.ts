import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoAppTodoUserListsListIdCollaboratorsCollaboratorId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  collaboratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoUser, listId, collaboratorId } = props;

  // SCHEMA CHECK: Ensure the list exists and is active (not soft-deleted)
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
  });
  if (!list || list.deleted_at !== null) {
    // List does not exist or has been soft-deleted
    throw new HttpException("Not Found", 404);
  }

  // Locate the active collaborator membership (if any)
  const membership =
    await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
      where: {
        todo_app_list_id: listId,
        todo_app_todouser_id: collaboratorId,
        deleted_at: null,
      },
    });

  // Idempotent behavior: if membership is missing or already soft-deleted,
  // consider the revoke operation successful (no-op).
  if (!membership) return;

  // AUTHORIZATION: Only the list owner may revoke collaborators. The API
  // contract also allows admins, but this function receives a TodouserPayload
  // only, so admin-path cannot be exercised here.
  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Prepare timestamp once and reuse for update + audit
  const now = toISOStringSafe(new Date());

  // Soft-delete the membership by setting deleted_at and updating updated_at
  await MyGlobal.prisma.todo_app_list_collaborators.update({
    where: { id: membership.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Persist an audit log entry for the revocation action
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4(),
      todo_app_admin_id: null,
      todo_app_admin_session_id: null,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      todo_app_list_id: listId,
      todo_app_task_id: null,
      event_type: "revoke_collaborator",
      target_type: "list_collaborator",
      target_id: membership.id,
      details: `Revoked collaborator ${collaboratorId} from list ${listId}`,
      ip: null,
      href: null,
      user_agent: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return;
}
