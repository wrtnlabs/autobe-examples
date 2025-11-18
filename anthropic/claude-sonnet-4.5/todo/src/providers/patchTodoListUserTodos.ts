import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListCategory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      todo_list_user_id: props.user.id,
    };

    if (!props.body.include_deleted) {
      conditions.deleted_at = null;
    }

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (props.body.priority) {
      conditions.priority = props.body.priority;
    }

    if (props.body.todo_list_category_id !== undefined) {
      conditions.todo_list_category_id = props.body.todo_list_category_id;
    }

    if (props.body.search) {
      conditions.OR = [
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ];
    }

    if (props.body.due_date_from || props.body.due_date_to) {
      const dueDateCondition: Record<string, Date> = {};
      if (props.body.due_date_from) {
        dueDateCondition.gte = new Date(props.body.due_date_from);
      }
      if (props.body.due_date_to) {
        dueDateCondition.lte = new Date(props.body.due_date_to);
      }
      conditions.due_date = dueDateCondition;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereCondition,
      include: {
        category: true,
      },
      skip,
      take: limit,
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.order ?? "desc",
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((todo) => {
      const category = todo.category
        ? {
            id: todo.category.id,
            name: todo.category.name,
            created_at: toISOStringSafe(todo.category.created_at),
          }
        : undefined;

      return {
        id: todo.id,
        ...(category !== undefined && { category }),
        title: todo.title,
        due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
        priority: typia.assert<"low" | "medium" | "high">(todo.priority),
        status: typia.assert<"pending" | "completed">(todo.status),
        created_at: toISOStringSafe(todo.created_at),
        updated_at: toISOStringSafe(todo.updated_at),
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
