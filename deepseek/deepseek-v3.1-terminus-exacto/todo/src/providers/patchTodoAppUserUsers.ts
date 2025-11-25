import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsers(props: {
  user: UserPayload;
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: Prisma.todo_app_usersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
  };

  // Determine order by
  const orderBy: Prisma.todo_app_usersOrderByWithRelationInput = {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";
    switch (props.body.order_by) {
      case "name":
        orderBy.name = direction;
        break;
      case "email":
        orderBy.email = direction;
        break;
      case "created_at":
        orderBy.created_at = direction;
        break;
      case "last_login_at":
        orderBy.last_login_at = direction;
        break;
    }
  } else {
    // Default ordering
    orderBy.created_at = "desc";
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_users.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      email: user.email as string & tags.Format<"email">,
      name: user.name,
      status: user.status,
      last_login_at: user.last_login_at
        ? (toISOStringSafe(user.last_login_at) as string &
            tags.Format<"date-time">)
        : undefined,
    })),
  };
}
