import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSnapshot";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppSnapshotAtSummaryTransformer } from "../transformers/TodoAppSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdSnapshots(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppSnapshot.IRequest;
}): Promise<IPageITodoAppSnapshot.ISummary> {
  // Verify todo exists and belongs to the authenticated member
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
  });
  // Build base where clause for snapshot filtering
  const baseWhere: Prisma.todo_app_snapshotsWhereInput = {
    todo_app_todos_id: props.todoId,
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.todo_app_snapshotsWhereInput;
  // Handle pagination
  const limit: number = props.body.limit ?? 20;
  const page: number = props.body.page ?? 1;
  const skip: number = (page - 1) * limit;
  // Build cursor-based where clause
  const cursorWhere: Prisma.todo_app_snapshotsWhereInput = {
    ...baseWhere,
    ...(props.body.cursor !== undefined && {
      created_at: {
        lt: new Date(props.body.cursor),
      },
    }),
  } satisfies Prisma.todo_app_snapshotsWhereInput;
  // Query snapshots with nested todo reference
  const snapshots = await MyGlobal.prisma.todo_app_snapshots.findMany({
    where: cursorWhere,
    orderBy: { created_at: "desc" },
    take: limit,
    ...TodoAppSnapshotAtSummaryTransformer.select(),
  });
  // Count total records for pagination metadata
  const total: number = await MyGlobal.prisma.todo_app_snapshots.count({
    where: baseWhere,
  });
  // Transform results to DTO format
  const data = await ArrayUtil.asyncMap(
    snapshots,
    TodoAppSnapshotAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const current: number = page;
  const pages: number = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppSnapshot.ISummary;
}
