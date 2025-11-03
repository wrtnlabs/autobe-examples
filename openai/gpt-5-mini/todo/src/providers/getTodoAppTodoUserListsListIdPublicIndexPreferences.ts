import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppPublicIndexPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPublicIndexPreference";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserListsListIdPublicIndexPreferences(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
}): Promise<ITodoAppPublicIndexPreference> {
  const { todoUser, listId } = props;

  // Ensure the list exists and is active
  const list = await MyGlobal.prisma.todo_app_lists.findUniqueOrThrow({
    where: { id: listId },
    select: { id: true, todo_app_todouser_id: true, deleted_at: true },
  });

  if (list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only owner (todoUser) may access
  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: You are not the owner of this list",
      403,
    );
  }

  // Fetch the 1:1 preferences row
  const pref =
    await MyGlobal.prisma.todo_app_public_index_preferences.findUnique({
      where: { todo_app_list_id: listId },
      select: {
        id: true,
        todo_app_list_id: true,
        indexing_enabled: true,
        allow_search_engine: true,
        allow_discovery: true,
        index_scope: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!pref || pref.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: pref.id as string & tags.Format<"uuid">,
    todoAppListId: pref.todo_app_list_id as string & tags.Format<"uuid">,
    indexingEnabled: pref.indexing_enabled,
    allowSearchEngine: pref.allow_search_engine,
    allowDiscovery: pref.allow_discovery,
    indexScope: pref.index_scope ?? null,
    createdAt: toISOStringSafe(pref.created_at),
    updatedAt: toISOStringSafe(pref.updated_at),
    deletedAt: pref.deleted_at ? toISOStringSafe(pref.deleted_at) : null,
  };
}
