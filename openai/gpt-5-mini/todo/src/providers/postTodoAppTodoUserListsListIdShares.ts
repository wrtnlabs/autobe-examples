import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postTodoAppTodoUserListsListIdShares(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppListShare.ICreate;
}): Promise<ITodoAppListShare> {
  const { todoUser, listId, body } = props;

  const parent = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    include: { owner: true },
  });

  if (!parent || parent.deleted_at !== null) {
    throw new HttpException("List not found", 404);
  }

  if (parent.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException("Forbidden: only list owner may create share", 403);
  }

  const existing = await MyGlobal.prisma.todo_app_list_shares.findFirst({
    where: {
      todo_app_list_id: listId,
      deleted_at: null,
    },
  });

  if (existing) {
    throw new HttpException("Active share already exists for this list", 409);
  }

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;
  const shareToken = v4();
  const expiresAt =
    body.expiresAt === undefined
      ? undefined
      : body.expiresAt === null
        ? null
        : toISOStringSafe(body.expiresAt);

  const created = await MyGlobal.prisma.todo_app_list_shares.create({
    data: {
      id: newId,
      todo_app_list_id: listId,
      created_by_todouser_id: todoUser.id,
      share_token: shareToken,
      public_url: body.publicUrl ?? null,
      is_public: body.isPublic,
      visibility: body.visibility,
      expires_at: expiresAt ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_list_id: listId,
      event_type: "create_share",
      target_type: "list",
      target_id: listId,
      details: `share_created:${created.id}`,
      created_at: now,
      updated_at: now,
    },
  });

  const owner = parent.owner;

  const ownerSummary = {
    id: owner.id as string & tags.Format<"uuid">,
    displayName: owner.display_name ?? null,
    isVerified: owner.is_verified,
    status: owner.status ?? undefined,
    createdAt: toISOStringSafe(owner.created_at),
    updatedAt: toISOStringSafe(owner.updated_at),
  } satisfies ITodoAppTodoUser.ISummary;

  const listSummary = {
    id: parent.id as string & tags.Format<"uuid">,
    title: parent.title,
    visibility: parent.visibility,
    owner: ownerSummary,
    description: parent.description ?? null,
    createdAt: toISOStringSafe(parent.created_at),
    updatedAt: toISOStringSafe(parent.updated_at),
    deletedAt: parent.deleted_at ? toISOStringSafe(parent.deleted_at) : null,
  } satisfies ITodoAppList.ISummary;

  return {
    id: created.id as string & tags.Format<"uuid">,
    todoAppListId: created.todo_app_list_id as string & tags.Format<"uuid">,
    list: listSummary,
    createdByTodouserId: created.created_by_todouser_id as string &
      tags.Format<"uuid">,
    createdBy: ownerSummary,
    shareToken: created.share_token,
    publicUrl: created.public_url ?? null,
    isPublic: created.is_public,
    visibility: created.visibility as
      | "public"
      | "shared"
      | "shared-invite-only",
    expiresAt: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
