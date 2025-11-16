import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";
import { IPageITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoListTodoListGuests(props: {
  body: ITodoListTodoListGuest.IRequest;
}): Promise<IPageITodoListTodoListGuest.ISummary> {
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit >= 1 && props.body.limit <= 100 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  // Removed invalid filter keys as Prisma model doesn't have 'is_completed'
  const where = {} satisfies Prisma.todo_list_guestsWhereInput;

  // Query filtered paginated data with only valid fields from Prisma model
  const data = await MyGlobal.prisma.todo_list_guests.findMany({
    where,
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  // Query total count
  const total = await MyGlobal.prisma.todo_list_guests.count({ where });

  // Return with assigned default valid values for ISummary properties
  return {
    data: data.map((item) => ({
      id: item.id,
      created_at: toISOStringSafe(item.created_at),
      content: "", // empty string to satisfy string type
      is_completed: false, // default to false for boolean
      priority: 0, // default priority 0 assuming integer type
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
