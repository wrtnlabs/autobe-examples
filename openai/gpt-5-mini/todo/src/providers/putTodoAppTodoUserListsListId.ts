import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putTodoAppTodoUserListsListId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppList.IUpdate;
}): Promise<ITodoAppList> {
  const { todoUser, listId, body } = props;

  // Load existing list and its owner
  const existing = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    include: { owner: true },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the owner may update
  if (existing.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: Only the owner can update this list",
      403,
    );
  }

  // Business-level validations (not type validation)
  if (body.visibility !== undefined) {
    const allowed = ["private", "shared-invite-only", "public"] as const;
    if (!allowed.includes(body.visibility)) {
      throw new HttpException("Bad Request: invalid visibility", 400);
    }
  }

  if (body.title !== undefined) {
    if (body.title.length < 1 || body.title.length > 250) {
      throw new HttpException("Bad Request: title length must be 1..250", 400);
    }
  }

  const now = toISOStringSafe(new Date());

  // Perform update
  await MyGlobal.prisma.todo_app_lists.update({
    where: { id: listId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.visibility !== undefined && { visibility: body.visibility }),
      updated_at: now,
    },
  });

  // Handle public indexing preferences when visibility changes
  if (body.visibility !== undefined) {
    if (body.visibility === "public") {
      await MyGlobal.prisma.todo_app_public_index_preferences.upsert({
        where: { todo_app_list_id: listId },
        create: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_list_id: listId,
          indexing_enabled: true,
          allow_search_engine: true,
          allow_discovery: true,
          index_scope: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        update: {
          indexing_enabled: true,
          allow_search_engine: true,
          allow_discovery: true,
          updated_at: now,
          deleted_at: null,
        },
      });
    } else {
      await MyGlobal.prisma.todo_app_public_index_preferences.updateMany({
        where: { todo_app_list_id: listId },
        data: {
          indexing_enabled: false,
          allow_search_engine: false,
          allow_discovery: false,
          updated_at: now,
        },
      });
    }
  }

  // Record audit event
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      todo_app_list_id: listId,
      event_type: "update",
      target_type: "list",
      target_id: listId,
      details: JSON.stringify({ changed: Object.keys(body) }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the fresh record with converted dates
  const fresh = await MyGlobal.prisma.todo_app_lists.findUniqueOrThrow({
    where: { id: listId },
    include: { owner: true },
  });

  return {
    id: fresh.id as string & tags.Format<"uuid">,
    title: fresh.title,
    description:
      fresh.description === null ? null : (fresh.description ?? undefined),
    visibility: fresh.visibility as "private" | "shared-invite-only" | "public",
    owner: {
      id: fresh.owner.id as string & tags.Format<"uuid">,
      displayName:
        fresh.owner.display_name === null
          ? null
          : (fresh.owner.display_name ?? undefined),
      isVerified: fresh.owner.is_verified,
      status: fresh.owner.status ?? undefined,
      createdAt: toISOStringSafe(fresh.owner.created_at),
      updatedAt: toISOStringSafe(fresh.owner.updated_at),
    },
    createdAt: toISOStringSafe(fresh.created_at),
    updatedAt: toISOStringSafe(fresh.updated_at),
    deletedAt: fresh.deleted_at ? toISOStringSafe(fresh.deleted_at) : null,
  };
}
