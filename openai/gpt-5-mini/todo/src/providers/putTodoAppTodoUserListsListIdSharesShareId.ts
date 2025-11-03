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

export async function putTodoAppTodoUserListsListIdSharesShareId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  shareId: string & tags.Format<"uuid">;
  body: ITodoAppListShare.IUpdate;
}): Promise<ITodoAppListShare> {
  const { todoUser, listId, shareId, body } = props;

  const list = await MyGlobal.prisma.todo_app_lists.findUniqueOrThrow({
    where: { id: listId },
    select: { id: true, todo_app_todouser_id: true },
  });

  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: Only list owner or admin can update this share",
      403,
    );
  }

  const share = await MyGlobal.prisma.todo_app_list_shares.findUniqueOrThrow({
    where: { id: shareId },
  });

  if (share.todo_app_list_id !== listId) {
    throw new HttpException("Not Found", 404);
  }

  if (share.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_app_list_shares.update({
    where: { id: shareId },
    data: {
      is_public: body.isPublic ?? undefined,
      public_url:
        body.publicUrl === null ? null : (body.publicUrl ?? undefined),
      visibility: body.visibility ?? undefined,
      expires_at:
        body.expiresAt === null
          ? null
          : body.expiresAt !== undefined
            ? toISOStringSafe(body.expiresAt)
            : undefined,
      updated_at: now,
    },
    select: {
      id: true,
      todo_app_list_id: true,
      created_by_todouser_id: true,
      share_token: true,
      public_url: true,
      is_public: true,
      visibility: true,
      expires_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      todo_app_list_id: listId,
      event_type: "update",
      target_type: "list_share",
      target_id: shareId,
      details: JSON.stringify({ changes: body }),
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    todoAppListId: updated.todo_app_list_id as string & tags.Format<"uuid">,
    list: undefined,
    createdByTodouserId: updated.created_by_todouser_id as string &
      tags.Format<"uuid">,
    createdBy: undefined,
    shareToken: updated.share_token,
    publicUrl:
      updated.public_url === null ? null : (updated.public_url ?? undefined),
    isPublic: updated.is_public,
    visibility: typia.assert<"shared-invite-only" | "public" | "shared">(
      updated.visibility,
    ),
    expiresAt: updated.expires_at ? toISOStringSafe(updated.expires_at) : null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
