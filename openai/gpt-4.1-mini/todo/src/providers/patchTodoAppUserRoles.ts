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
  const page =
    props.body.page !== undefined && props.body.page !== null
      ? Math.max(props.body.page, 1)
      : 1;
  const limit =
    props.body.limit !== undefined && props.body.limit !== null
      ? Math.max(props.body.limit, 1)
      : 100;
  const skip = (page - 1) * limit;
  // Construct where condition for filtering
  const whereCondition = {
    AND: [
      {
        deleted_at: null,
      },
      ...(props.body.searchTerm
        ? [
            {
              OR: [
                {
                  name: {
                    contains: props.body.searchTerm,
                    mode: "insensitive" as const,
                  },
                },
                {
                  description: {
                    contains: props.body.searchTerm,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ]
        : []),
      ...(props.body.roleName ? [{ name: props.body.roleName }] : []),
    ],
  } satisfies Prisma.todo_app_rolesWhereInput;
  // Validate and set sortBy and sortOrder with defaults
  const validSortFields = ["name", "created_at", "updated_at", "description"];
  const sortBy =
    props.body.sortBy && validSortFields.includes(props.body.sortBy)
      ? props.body.sortBy
      : "created_at";
  const sortOrder =
    props.body.sortOrder === "asc" || props.body.sortOrder === "desc"
      ? props.body.sortOrder
      : "desc";
  const roles = await MyGlobal.prisma.todo_app_roles.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });
  const total = await MyGlobal.prisma.todo_app_roles.count({
    where: whereCondition,
  });
  // Map database records to ITodoAppRole.ISummary with date formatting
  const data = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
