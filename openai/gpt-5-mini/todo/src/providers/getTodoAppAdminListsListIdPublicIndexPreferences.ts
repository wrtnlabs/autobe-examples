import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppPublicIndexPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPublicIndexPreference";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminListsListIdPublicIndexPreferences(props: {
  admin: AdminPayload;
  listId: string & tags.Format<"uuid">;
}): Promise<ITodoAppPublicIndexPreference> {
  const { admin, listId } = props;

  // Use the provided admin payload for authorization enforcement
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (
    !adminRecord ||
    adminRecord.deleted_at !== null ||
    adminRecord.is_active !== true
  ) {
    throw new HttpException("Unauthorized", 403);
  }

  // Verify the parent list exists and is active (not soft-deleted)
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    select: { id: true, deleted_at: true },
  });

  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Fetch the 1:1 public index preferences record
  const pref =
    await MyGlobal.prisma.todo_app_public_index_preferences.findUnique({
      where: { todo_app_list_id: listId },
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
