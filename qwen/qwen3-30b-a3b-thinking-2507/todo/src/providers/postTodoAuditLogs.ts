import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAuditLogCollector } from "../collectors/TodoAuditLogCollector";
import { TodoAuditLogTransformer } from "../transformers/TodoAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAuditLogs(props: {
  body: ITodoAuditLog.ICreate;
}): Promise<ITodoAuditLog> {
  const authenticatedUser = (MyGlobal as any).authenticatedUser;
  if (!authenticatedUser) {
    throw new HttpException("Unauthorized", 401);
  }
  const collected = await TodoAuditLogCollector.collect({
    body: props.body,
    todoUsers: authenticatedUser,
  });
  const created = await MyGlobal.prisma.todo_audit_logs.create({
    data: {
      ...collected,
      user: { connect: { id: authenticatedUser.id } },
    },
  });
  return await TodoAuditLogTransformer.transform(created);
}
