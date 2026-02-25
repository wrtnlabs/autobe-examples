import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
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

export async function getTodoAppUserTodosTrashCleanupLogsCleanupLogId(props: {
  user: UserPayload;
  cleanupLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTrashCleanupLog> {
  const cleanupLog =
    await MyGlobal.prisma.todo_app_trash_cleanup_logs.findFirstOrThrow({
      where: {
        id: props.cleanupLogId,
        trashItem: {
          todo: {
            todo_app_user_id: props.user.id,
            deleted_at: null,
          },
        },
      },
      ...TodoAppTrashCleanupLogTransformer.select(),
    });
  return await TodoAppTrashCleanupLogTransformer.transform(cleanupLog);
}
