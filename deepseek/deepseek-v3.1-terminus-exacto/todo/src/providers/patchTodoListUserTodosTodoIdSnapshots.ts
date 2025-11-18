import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoSnapshot";
import { IPageITodoListTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodosTodoIdSnapshots(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodoSnapshot.IRequest;
}): Promise<IPageITodoListTodoSnapshot.ISummary> {
  // Verify the todo exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Parse pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;

  // Validate sort_by parameter - only 'created_at' is supported
  const sortBy =
    props.body.sort_by === "created_at" ? "created_at" : "created_at";
  const order = props.body.order === "asc" ? "asc" : "desc";

  // Build where condition for snapshots
  const whereCondition = {
    todo_list_todo_id: props.todoId,
  };

  // Execute parallel queries for data and count
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todo_snapshots.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.todo_list_todo_snapshots.count({
      where: whereCondition,
    }),
  ]);

  // Convert to summary format with proper date formatting
  const data: ITodoListTodoSnapshot.ISummary[] = snapshots.map((snapshot) => ({
    id: snapshot.id as string & tags.Format<"uuid">,
    title: snapshot.title,
    status: snapshot.status,
    created_at: toISOStringSafe(snapshot.created_at),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
