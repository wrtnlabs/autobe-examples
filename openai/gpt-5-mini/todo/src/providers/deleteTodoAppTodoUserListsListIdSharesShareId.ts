import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoAppTodoUserListsListIdSharesShareId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  shareId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoUser, listId, shareId } = props;

  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    select: { id: true, todo_app_todouser_id: true, deleted_at: true },
  });

  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: Only the list owner may revoke shares",
      403,
    );
  }

  const share = await MyGlobal.prisma.todo_app_list_shares.findFirst({
    where: { id: shareId, todo_app_list_id: listId },
    select: { id: true, deleted_at: true },
  });

  if (!share || share.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());
  const auditId = v4() satisfies string & tags.Format<"uuid">;

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_list_shares.update({
      where: { id: shareId },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: auditId,
        todo_app_todouser_id: todoUser.id,
        todo_app_todouser_session_id: todoUser.session_id,
        todo_app_list_id: listId,
        todo_app_task_id: null,
        event_type: "share_revoked",
        target_type: "list_share",
        target_id: shareId,
        details: null,
        ip: null,
        href: null,
        user_agent: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
  ]);

  return;
}
