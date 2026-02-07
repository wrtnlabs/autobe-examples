import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashCleanupLogTransformer } from "../transformers/TodoAppTrashCleanupLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTrashCleanupLogsCleanupLogId(props: {
  user: UserPayload;
  cleanupLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTrashCleanupLog> {
  const cleanupLog =
    await MyGlobal.prisma.todo_app_trash_cleanup_logs.findUnique({
      where: { id: props.cleanupLogId },
      ...TodoAppTrashCleanupLogTransformer.select(),
    });
  if (!cleanupLog) {
    throw new HttpException("Cleanup log not found", 404);
  }
  return await TodoAppTrashCleanupLogTransformer.transform(cleanupLog);
}
