import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsers(props: {
  user: UserPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {};

  if (!props.body.include_deleted) {
    whereConditions.deleted_at = null;
  }

  if (props.body.search) {
    whereConditions.OR = [
      { email: { contains: props.body.search } },
      { name: { contains: props.body.search } },
    ];
  }

  if (props.body.email) {
    whereConditions.email = { contains: props.body.email };
  }

  if (props.body.name) {
    whereConditions.name = { contains: props.body.name };
  }

  if (props.body.created_at_start || props.body.created_at_end) {
    const createdAtFilter: Record<string, unknown> = {};
    if (props.body.created_at_start) {
      createdAtFilter.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      createdAtFilter.lte = new Date(props.body.created_at_end);
    }
    whereConditions.created_at = createdAtFilter;
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_users.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: users.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      email: user.email,
      name: user.name as (string & tags.MaxLength<100>) | null,
      created_at: toISOStringSafe(user.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
