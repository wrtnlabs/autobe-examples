import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import { IPageITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoItemAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodoItemAuditLogs(props: {
  user: UserPayload;
  body: ITodoAppTodoItemAuditLog.IRequest;
}): Promise<IPageITodoAppTodoItemAuditLog.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (props.body.limit ?? 100) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;
  const where = {
    id: props.body.id,
    todo_app_todo_item_id: props.body.todo_app_todo_item_id,
    action: props.body.action,
    todo_app_user_id: props.body.todo_app_user_id,
    created_at: {
      ...(props.body.created_at_from
        ? { gte: props.body.created_at_from }
        : {}),
      ...(props.body.created_at_to ? { lt: props.body.created_at_to } : {}),
    },
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.todo_app_todo_item_audit_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      todo_app_todo_item_id: true,
      action: true,
      todo_app_user_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_todo_item_audit_logs.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      todo_app_todo_item_id: item.todo_app_todo_item_id,
      user: {
        id: item.todo_app_user_id,
        email: "",
        username: "",
        created_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        updated_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        deleted_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
      },
      action: item.action,
      created_at: toISOStringSafe(item.created_at),
      updated_at: item.updated_at ? toISOStringSafe(item.updated_at) : null,
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
