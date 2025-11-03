import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putTodoAppTodoUserListsListIdCollaboratorsCollaboratorId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  collaboratorId: string & tags.Format<"uuid">;
  body: ITodoAppListCollaborator.IUpdate;
}): Promise<ITodoAppListCollaborator> {
  const { todoUser, listId, collaboratorId, body } = props;

  // 1) Verify parent list exists and is active
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
  });
  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found: list does not exist", 404);
  }

  // 2) Authorization: only list owner may update collaborator memberships
  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: Only the list owner may update memberships",
      403,
    );
  }

  // 3) Verify collaborator user exists and is active
  const collaboratorUser = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: collaboratorId },
  });
  if (!collaboratorUser || collaboratorUser.deleted_at !== null) {
    throw new HttpException("Not Found: collaborator user does not exist", 404);
  }

  // 4) Find existing membership by composite key
  const membership =
    await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
      where: {
        todo_app_list_id: listId,
        todo_app_todouser_id: collaboratorId,
      },
    });

  if (!membership || membership.deleted_at !== null) {
    throw new HttpException("Not Found: membership not found", 404);
  }

  // 5) Prepare timestamp
  const now = toISOStringSafe(new Date());

  // 6) Perform update (inline data object)
  const updated = await MyGlobal.prisma.todo_app_list_collaborators.update({
    where: { id: membership.id },
    data: {
      ...(body.role !== undefined && { role: body.role }),
      ...(body.acceptedAt !== undefined && {
        accepted_at:
          body.acceptedAt === null ? null : toISOStringSafe(body.acceptedAt),
      }),
      updated_at: now,
    },
  });

  // 7) Load 'addedBy' user summary (must exist per schema)
  const addedByUser = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: membership.added_by_todouser_id },
  });
  if (!addedByUser) {
    throw new HttpException("Internal Server Error: addedBy user missing", 500);
  }

  // 8) Create audit log entry
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      todo_app_list_id: listId,
      event_type: "membership.update",
      target_type: "list",
      target_id: listId,
      details: `Updated membership ${membership.id} for collaborator ${collaboratorId}: role -> ${updated.role}`,
      created_at: now,
      updated_at: now,
    },
  });

  // 9) Build response following ITodoAppListCollaborator shape
  const response: ITodoAppListCollaborator = {
    id: updated.id as string & tags.Format<"uuid">,
    listId: updated.todo_app_list_id as string & tags.Format<"uuid">,
    user: {
      id: collaboratorUser.id as string & tags.Format<"uuid">,
      displayName: collaboratorUser.display_name ?? null,
      isVerified: collaboratorUser.is_verified,
      status: collaboratorUser.status ?? undefined,
      createdAt: toISOStringSafe(collaboratorUser.created_at),
      updatedAt: toISOStringSafe(collaboratorUser.updated_at),
    },
    addedBy: {
      id: addedByUser.id as string & tags.Format<"uuid">,
      displayName: addedByUser.display_name ?? null,
      isVerified: addedByUser.is_verified,
      status: addedByUser.status ?? undefined,
      createdAt: toISOStringSafe(addedByUser.created_at),
      updatedAt: toISOStringSafe(addedByUser.updated_at),
    },
    role: typia.assert<"read-only" | "read-write">(updated.role),
    acceptedAt: updated.accepted_at
      ? toISOStringSafe(updated.accepted_at)
      : null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: membership.deleted_at
      ? toISOStringSafe(membership.deleted_at)
      : undefined,
  };

  return response;
}
