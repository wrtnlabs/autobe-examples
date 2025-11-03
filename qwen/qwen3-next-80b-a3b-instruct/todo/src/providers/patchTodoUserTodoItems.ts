import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import { IPageITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodoItems(props: {
  user: UserPayload;
  body: ITodoItem.IRequest;
}): Promise<IPageITodoItem.ISummary> {
  // Extract pagination and filtering parameters from request body
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const status = props.body.status === "null" ? undefined : props.body.status;
  const sort_by =
    props.body.sort_by === "null" ? "created_at" : props.body.sort_by;
  const order = props.body.order === "null" ? "desc" : props.body.order;

  // Validate sort_by only allows 'created_at' as per business rule
  if (sort_by !== "created_at") {
    throw new HttpException(
      "Invalid sort_by value. Only created_at is allowed.",
      400,
    );
  }

  // Validate order only allows 'desc' as per business rule
  if (order !== "desc") {
    throw new HttpException("Invalid order value. Only desc is allowed.", 400);
  }

  // Build the where clause for Prisma query
  const where: Record<string, any> = {
    todo_user_id: props.user.id,
    deleted_at: null,
  };

  // Add status filter if specified
  if (status !== undefined) {
    where.status = status;
  }

  // Calculate offset for pagination
  const skip = (page - 1) * limit;

  // Execute the database query
  const [items, total] = await Promise.all([
    MyGlobal.prisma.todo_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        text: true,
        status: true,
      },
    }),
    MyGlobal.prisma.todo_items.count({ where }),
  ]);

  // Format the response according to IPageITodoItem.ISummary
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      text: item.text,
      status: item.status satisfies string as "pending" | "completed",
    })),
  };
}
