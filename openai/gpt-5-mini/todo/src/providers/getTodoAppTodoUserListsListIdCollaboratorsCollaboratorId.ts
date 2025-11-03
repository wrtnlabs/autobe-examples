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

export async function getTodoAppTodoUserListsListIdCollaboratorsCollaboratorId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  collaboratorId: string & tags.Format<"uuid">;
}): Promise<ITodoAppListCollaborator> {
  const { todoUser, listId, collaboratorId } = props;

  // Verify parent list exists and is not soft-deleted
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    select: { id: true, todo_app_todouser_id: true, deleted_at: true },
  });

  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Retrieve the collaborator membership and include minimal user summaries
  const membership =
    await MyGlobal.prisma.todo_app_list_collaborators.findUnique({
      where: { id: collaboratorId },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        addedBy: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

  if (
    !membership ||
    membership.todo_app_list_id !== listId ||
    membership.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the list owner or the collaborator themselves may access
  if (
    todoUser.id !== list.todo_app_todouser_id &&
    todoUser.id !== membership.todo_app_todouser_id
  ) {
    throw new HttpException("Unauthorized: Access denied", 403);
  }

  // Map database results to the API DTO, converting dates safely and avoiding sensitive fields
  return {
    id: membership.id as string & tags.Format<"uuid">,
    listId: membership.todo_app_list_id as string & tags.Format<"uuid">,
    user: {
      id: membership.user.id as string & tags.Format<"uuid">,
      displayName: membership.user.display_name ?? null,
      isVerified: membership.user.is_verified,
      status: membership.user.status,
      createdAt: toISOStringSafe(membership.user.created_at),
      updatedAt: toISOStringSafe(membership.user.updated_at),
    },
    addedBy: {
      id: membership.addedBy.id as string & tags.Format<"uuid">,
      displayName: membership.addedBy.display_name ?? null,
      isVerified: membership.addedBy.is_verified,
      status: membership.addedBy.status,
      createdAt: toISOStringSafe(membership.addedBy.created_at),
      updatedAt: toISOStringSafe(membership.addedBy.updated_at),
    },
    role: membership.role as "read-only" | "read-write",
    acceptedAt: membership.accepted_at
      ? toISOStringSafe(membership.accepted_at)
      : null,
    createdAt: toISOStringSafe(membership.created_at),
    updatedAt: toISOStringSafe(membership.updated_at),
    deletedAt: membership.deleted_at
      ? toISOStringSafe(membership.deleted_at)
      : undefined,
  };
}
