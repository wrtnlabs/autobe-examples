import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";
import { IPageITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserRoles(props: {
  user: UserPayload;
  body: ITodoAppRole.IRequest;
}): Promise<IPageITodoAppRole.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where condition
  const where = {
    deleted_at: null,
    ...(props.body.searchTerm
      ? {
          OR: [
            { name: { contains: props.body.searchTerm } },
            { description: { contains: props.body.searchTerm } },
          ],
        }
      : {}),
    ...(props.body.roleType
      ? {
          role_type: props.body.roleType,
        }
      : {}),
  } satisfies Prisma.todo_app_rolesWhereInput;
  const data = await MyGlobal.prisma.todo_app_roles.findMany({
    where,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_roles.count({ where });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data,
  };
}
