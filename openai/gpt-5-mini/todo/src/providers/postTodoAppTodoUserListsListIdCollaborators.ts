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

export async function postTodoAppTodoUserListsListIdCollaborators(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppListCollaborator.ICreate;
}): Promise<ITodoAppListCollaborator> {
  const { todoUser, listId, body } = props;

  // Business validation: role must be one of allowed values
  if (body.role !== "read-only" && body.role !== "read-write") {
    throw new HttpException("Invalid role value", 400);
  }

  // Verify parent list exists and is not soft-deleted
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    select: { id: true, todo_app_todouser_id: true, deleted_at: true },
  });
  if (!list || list.deleted_at !== null) {
    throw new HttpException("List not found", 404);
  }

  // Authorization: only the list owner can add collaborators
  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: Only list owner can add collaborators",
      403,
    );
  }

  // Verify invited user exists and is active
  const invitee = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: body.todoAppTodouserId },
    select: {
      id: true,
      display_name: true,
      is_verified: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!invitee || invitee.deleted_at !== null) {
    throw new HttpException("Invited user not found", 404);
  }

  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.todo_app_list_collaborators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_list_id: listId,
        todo_app_todouser_id: body.todoAppTodouserId,
        added_by_todouser_id: todoUser.id,
        role: body.role,
        accepted_at: null,
        created_at: now,
        updated_at: now,
      },
    });

    // Fetch addedBy profile to build summary
    const addedByRecord =
      await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
        where: { id: created.added_by_todouser_id },
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

    const result: ITodoAppListCollaborator = {
      id: created.id as string & tags.Format<"uuid">,
      listId: created.todo_app_list_id as string & tags.Format<"uuid">,
      user: {
        id: invitee.id as string & tags.Format<"uuid">,
        displayName: invitee.display_name ?? null,
        isVerified: invitee.is_verified,
        status: invitee.status ?? undefined,
        createdAt: toISOStringSafe(invitee.created_at),
        updatedAt: toISOStringSafe(invitee.updated_at),
      },
      addedBy: {
        id: addedByRecord.id as string & tags.Format<"uuid">,
        displayName: addedByRecord.display_name ?? null,
        isVerified: addedByRecord.is_verified,
        status: addedByRecord.status ?? undefined,
        createdAt: toISOStringSafe(addedByRecord.created_at),
        updatedAt: toISOStringSafe(addedByRecord.updated_at),
      },
      role: created.role as "read-only" | "read-write",
      acceptedAt: created.accepted_at
        ? toISOStringSafe(created.accepted_at)
        : null,
      createdAt: toISOStringSafe(created.created_at),
      updatedAt: toISOStringSafe(created.updated_at),
      deletedAt: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };

    return result;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("User is already a collaborator", 409);
    }
    throw e;
  }
}
