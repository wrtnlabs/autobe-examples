import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserPersonalDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPersonalDataExport";
import { IEPersonalDataExportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPersonalDataExportStatus";
import { ITodoUserExportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserExportSnapshot";
import { ITodoTodoExportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoExportSnapshot";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserReportsPersonalData(props: {
  user: UserPayload;
  body: ITodoUserPersonalDataExport.ICreate;
}): Promise<ITodoUserPersonalDataExport> {
  const { user } = props;

  const exportId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const dbUser = await MyGlobal.prisma.todo_users.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  const dbTodos = await MyGlobal.prisma.todo_todos.findMany({
    where: { todo_user_id: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      completed: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });

  const todos: ITodoTodoExportSnapshot[] = dbTodos.map((t) => {
    const dueDate = t.due_date
      ? (toISOStringSafe(t.due_date).slice(0, 10) as string &
          tags.Format<"date">)
      : null;

    return {
      id: t.id as string & tags.Format<"uuid">,
      title: t.title as string &
        tags.MinLength<1> &
        tags.MaxLength<120> &
        tags.Pattern<"^[^\\r\
]*$">,
      description: t.description ?? null,
      due_date: dueDate,
      completed: t.completed,
      created_at: toISOStringSafe(t.created_at),
      updated_at: toISOStringSafe(t.updated_at),
    } satisfies ITodoTodoExportSnapshot;
  });

  try {
    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_user_id: user.id,
        todo_user_session_id: user.session_id,
        actor_type: "user",
        category: "user_data",
        action: "personal_data_export_create",
        success: true,
        message: null,
        resource_type: "personal_data_export",
        resource_id: exportId,
        created_at: now,
        updated_at: now,
      },
    });
  } catch {
    // ignore audit failures
  }

  return {
    id: exportId,
    status: "ready" satisfies IEPersonalDataExportStatus,
    requested_at: now,
    user: {
      id: dbUser.id as string & tags.Format<"uuid">,
      email: dbUser.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(dbUser.created_at),
      updated_at: toISOStringSafe(dbUser.updated_at),
    },
    todos,
  } satisfies ITodoUserPersonalDataExport;
}
