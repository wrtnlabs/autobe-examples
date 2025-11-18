import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminTodoListGuests(props: {
  admin: AdminPayload;
  body: ITodoListGuest.IRequest;
}): Promise<IPageITodoListGuest.ISummary> {
  const page = (props.body.page as number | null | undefined) ?? 1;
  const limit = (props.body.limit as number | null | undefined) ?? 100;

  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }

  if (limit < 1) {
    throw new HttpException("Limit must be at least 1", 400);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_guests.findMany({
      take: limit,
      skip,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_guests.count(),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id,
      visitor_ip: item.visitor_ip,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
