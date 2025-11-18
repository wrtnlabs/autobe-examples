import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserDeletionLog";
import { IPageITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserDeletionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsersUserIdDeletionLogs(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserDeletionLog.IRequest;
}): Promise<IPageITodoListUserDeletionLog.ISummary> {
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit = props.body.limit >= 1 ? props.body.limit : 20;
  const skip = (page - 1) * limit;
  const orderByField = props.body.orderBy ?? "deleted_at";
  const orderDir = props.body.orderDirection ?? "desc";

  // Retrieve records and count in parallel
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_deletion_logs.findMany({
      where: { user_id: props.userId },
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDir },
    }),
    MyGlobal.prisma.todo_list_user_deletion_logs.count({
      where: { user_id: props.userId },
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: logs.map((log) => ({
      id: log.id,
      user_id: log.user_id,
      deleted_by_admin_id: log.deleted_by_admin_id ?? undefined,
      reason: log.reason,
      deleted_at: toISOStringSafe(log.deleted_at),
    })),
  };
}
