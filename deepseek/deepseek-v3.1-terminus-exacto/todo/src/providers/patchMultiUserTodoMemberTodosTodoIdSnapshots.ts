import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoSnapshotAtSummaryTransformer } from "../transformers/MultiUserTodoTodoSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdSnapshots(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoSnapshot.IRequest;
}): Promise<IPageIMultiUserTodoTodoSnapshot.ISummary> {
  // Verify todo exists and belongs to the authenticated member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, multi_user_todo_member_id: true },
  });
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.multi_user_todo_todo_snapshotsWhereInput = {
    multi_user_todo_todo_id: todo.id,
    ...(props.body.created_after !== undefined && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  };
  // Fetch paginated snapshots
  const snapshots =
    await MyGlobal.prisma.multi_user_todo_todo_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...MultiUserTodoTodoSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.multi_user_todo_todo_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    snapshots,
    MultiUserTodoTodoSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
